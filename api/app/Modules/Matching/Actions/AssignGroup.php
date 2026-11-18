<?php

namespace App\Modules\Matching\Actions;

use App\Modules\Accounts\Queries\EmployeeIds;
use App\Modules\Accounts\Queries\LockUser;
use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Courses\Queries\LockCourse;
use App\Modules\Matching\ErrorCode;
use App\Modules\Matching\Exceptions\MatchingRuleViolation;
use App\Modules\Matching\Models\GroupAssignment;
use App\Modules\Matching\Models\Request;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Admin assigns a group (UJ-4): one assignment and one pending Request per Learner to the chosen
 * Employee, all with one sent time. A refusal creates nothing. Once it commits, the chosen
 * Employee gets the ordinary new-Request notice for each Request; Learners get none.
 */
class AssignGroup
{
    public function __construct(
        private readonly EmployeeIds $employeeIds,
        private readonly LockUser $lockUser,
        private readonly LockCourse $lockCourse,
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
        private readonly SendNotice $sendNotice,
    ) {}

    /**
     * @param  list<int>  $learnerIds  distinct, in the order Admin listed them; the Requests follow it
     * @return array{course_title: string, mentor_name: string, learner_names: list<string>, created_at: Carbon}
     *
     * @throws ValidationException when the Course, the chosen Employee or a Learner is unknown, or a person is Admin
     * @throws MatchingRuleViolation when the Course is a draft
     */
    public function handle(int $courseId, int $mentorId, array $learnerIds): array
    {
        return DB::transaction(function () use ($courseId, $mentorId, $learnerIds): array {
            $courseTitle = $this->courseTitles->handle([$courseId])[$courseId] ?? null;
            $employees = $this->employeeIds->handle([$mentorId, ...$learnerIds]);

            $errors = [];
            if ($courseTitle === null) {
                $errors['course_id'] = 'Choose a course.';
            }
            if (! in_array($mentorId, $employees, true)) {
                $errors['mentor_id'] = 'Choose an employee.';
            }
            if (array_diff($learnerIds, $employees) !== []) {
                $errors['learner_ids'] = 'Choose employees only.';
            }
            if ($errors !== []) {
                throw ValidationException::withMessages($errors);
            }

            // Learners first, in id order, then the Course: the order `SendRequest` takes them in,
            // so a Learner's own send and this assignment cannot deadlock (AD-3).
            $lockOrder = $learnerIds;
            sort($lockOrder);
            foreach ($lockOrder as $learnerId) {
                $this->lockUser->handle($learnerId);
            }

            if (! $this->lockCourse->handle($courseId)) {
                throw new MatchingRuleViolation(ErrorCode::CourseNotPublished);
            }

            $sentAt = now();
            $assignment = GroupAssignment::query()->create([
                'course_id' => $courseId,
                'mentor_id' => $mentorId,
                'created_at' => $sentAt,
            ]);

            $names = $this->userNames->handle([$mentorId, ...$learnerIds]);
            $learnerNames = [];
            foreach ($learnerIds as $learnerId) {
                Request::query()->create([
                    'learner_id' => $learnerId,
                    'mentor_id' => $mentorId,
                    'course_id' => $courseId,
                    'group_assignment_id' => $assignment->id,
                    'sent_at' => $sentAt,
                ]);
                $learnerNames[] = $names[$learnerId] ?? '';

                // Stored only after this transaction commits (AD-11). The same notice a Learner's own
                // Request sends: the Learner's name and the Course title, no group (AD-8).
                $this->sendNotice->handle($mentorId, NoticeType::RequestSent, [
                    'person_name' => $names[$learnerId] ?? '',
                    'course_title' => $courseTitle,
                ]);
            }

            return [
                'course_title' => $courseTitle,
                'mentor_name' => $names[$mentorId] ?? '',
                'learner_names' => $learnerNames,
                'created_at' => $sentAt,
            ];
        });
    }
}
