<?php

namespace App\Modules\Matching\Actions;

use App\Modules\Accounts\Queries\LockUser;
use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Courses\Queries\LockCourse;
use App\Modules\Matching\Exceptions\MatchingRuleViolation;
use App\Modules\Matching\Models\Request;
use App\Modules\Matching\Queries\LearnerEligibility;
use App\Modules\Mentors\Queries\IsCourseMentor;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Records one open Request. The Learner and Course rows are locked, in that order, and the
 * eligibility check runs under those locks so two sends cannot both commit (AD-3, AD-12).
 * Once the Request commits, the Mentor gets one notice.
 */
class SendRequest
{
    public function __construct(
        private readonly LockUser $lockUser,
        private readonly LockCourse $lockCourse,
        private readonly IsCourseMentor $isCourseMentor,
        private readonly LearnerEligibility $learnerEligibility,
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
        private readonly SendNotice $sendNotice,
    ) {}

    /**
     * @throws NotFoundHttpException when the Course is missing or not published
     * @throws ValidationException when `mentor_id` is not a Mentor of that Course
     * @throws MatchingRuleViolation when the Learner may not request this Course
     */
    public function handle(int $learnerId, int $courseId, int $mentorId): Request
    {
        return DB::transaction(function () use ($learnerId, $courseId, $mentorId): Request {
            $this->lockUser->handle($learnerId);

            if (! $this->lockCourse->handle($courseId)) {
                throw new NotFoundHttpException('Not found.');
            }

            if (! $this->isCourseMentor->handle($courseId, $mentorId)) {
                throw ValidationException::withMessages([
                    'mentor_id' => "This person isn't a mentor for this course.",
                ]);
            }

            $refusal = $this->learnerEligibility->refusal($learnerId, $courseId, lock: true);

            if ($refusal !== null) {
                throw new MatchingRuleViolation($refusal);
            }

            $request = Request::query()->create([
                'learner_id' => $learnerId,
                'mentor_id' => $mentorId,
                'course_id' => $courseId,
                'sent_at' => now(),
            ]);

            // Stored only after this transaction commits (AD-11). The Learner's account name and
            // the Course title, and nothing else: no route (AD-8). A throw above stores nothing.
            $this->sendNotice->handle($mentorId, NoticeType::RequestSent, [
                'person_name' => $this->userNames->handle([$learnerId])[$learnerId] ?? '',
                'course_title' => $this->courseTitles->handle([$courseId])[$courseId] ?? '',
            ]);

            return $request;
        });
    }
}
