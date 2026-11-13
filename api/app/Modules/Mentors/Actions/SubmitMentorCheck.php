<?php

namespace App\Modules\Mentors\Actions;

use App\Modules\Mentors\ErrorCode;
use App\Modules\Mentors\Exceptions\MentorRuleViolation;
use App\Modules\Mentors\Models\MentorCheck;
use App\Modules\Mentors\Queries\MentorCheckStatus;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class SubmitMentorCheck
{
    public function __construct(private readonly MentorCheckStatus $mentorCheckStatus) {}

    /**
     * Records the Employee's one Mentor check (AD-15): the Courses they name, or a skip when
     * `$courseIds` is empty. The only writer of `mentor_checks` and `mentor_check_courses`.
     *
     * @param  list<int>  $courseIds  distinct Course ids; empty for a skip
     *
     * @throws MentorRuleViolation (a 409) when the check is already done, or when any Course is
     *                             unknown, a draft, or published at or after the account's creation.
     *                             Nothing is stored.
     */
    public function handle(int $userId, array $courseIds): void
    {
        DB::transaction(function () use ($userId, $courseIds): void {
            if (MentorCheck::query()->where('user_id', $userId)->exists()) {
                throw new MentorRuleViolation(ErrorCode::CheckDone);
            }

            $eligible = array_column($this->mentorCheckStatus->eligibleCourses($userId), 'id');
            if (array_diff($courseIds, $eligible) !== []) {
                throw new MentorRuleViolation(ErrorCode::CourseNotEligible);
            }

            try {
                $check = MentorCheck::query()->create(['user_id' => $userId]);
            } catch (UniqueConstraintViolationException) {
                // A concurrent submission committed first; this snapshot couldn't see it.
                throw new MentorRuleViolation(ErrorCode::CheckDone);
            }

            $check->courses()->createMany(array_map(fn (int $courseId): array => ['course_id' => $courseId], $courseIds));
        });
    }
}
