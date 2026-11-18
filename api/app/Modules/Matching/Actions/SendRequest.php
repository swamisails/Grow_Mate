<?php

namespace App\Modules\Matching\Actions;

use App\Modules\Accounts\Queries\LockUser;
use App\Modules\Courses\Queries\LockCourse;
use App\Modules\Matching\Exceptions\MatchingRuleViolation;
use App\Modules\Matching\Models\Request;
use App\Modules\Matching\Queries\LearnerEligibility;
use App\Modules\Mentors\Queries\IsCourseMentor;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Records one open Request. The Learner and Course rows are locked, in that order, and the
 * eligibility check runs under those locks so two sends cannot both commit (AD-3, AD-12).
 */
class SendRequest
{
    public function __construct(
        private readonly LockUser $lockUser,
        private readonly LockCourse $lockCourse,
        private readonly IsCourseMentor $isCourseMentor,
        private readonly LearnerEligibility $learnerEligibility,
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

            return Request::query()->create([
                'learner_id' => $learnerId,
                'mentor_id' => $mentorId,
                'course_id' => $courseId,
                'sent_at' => now(),
            ]);
        });
    }
}
