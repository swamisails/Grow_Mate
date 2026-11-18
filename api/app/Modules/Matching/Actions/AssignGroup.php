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
use App\Modules\Matching\Queries\LearnerEligibility;
use App\Modules\Mentors\Queries\RefusedForCourse;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Admin assigns a group (UJ-4): one assignment and one pending Request per Learner to the chosen
 * Employee, all with one sent time. A refusal creates nothing. Once it commits, the chosen
 * Employee gets the ordinary new-Request notice for each Request; Learners get none.
 *
 * Checked in order: the Employees (422), a draft Course, a chosen Employee refused the Course at
 * registration, then every Learner against R7 (409s). A Learner refusal marks each failing Learner
 * by its index in the submitted list and never says why (AD-12).
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
        private readonly RefusedForCourse $refusedForCourse,
        private readonly LearnerEligibility $learnerEligibility,
    ) {}

    /**
     * @param  list<int>  $learnerIds  distinct, in the order Admin listed them; the Requests follow it
     * @return array{course_title: string, mentor_name: string, learner_names: list<string>, created_at: Carbon}
     *
     * @throws ValidationException when the Course, the chosen Employee or a Learner is unknown, or a person is Admin
     * @throws MatchingRuleViolation when the Course is a draft, the chosen Employee was refused it, or a Learner can't be assigned
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

            if (in_array($mentorId, $this->refusedForCourse->handle($courseId), true)) {
                throw new MatchingRuleViolation(ErrorCode::MentorNotEligible, [
                    'mentor_id' => ["This employee can't be chosen for this course."],
                ]);
            }

            // Every Learner is checked, so Admin sees each one that fails; the R7 reason stays hidden.
            $notAssignable = [];
            foreach ($learnerIds as $index => $learnerId) {
                if ($this->learnerEligibility->refusal($learnerId, $courseId, lock: true) !== null) {
                    $notAssignable["learner_ids.{$index}"] = ["This learner can't be assigned to this course."];
                }
            }
            if ($notAssignable !== []) {
                throw new MatchingRuleViolation(ErrorCode::LearnerNotAssignable, $notAssignable);
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
