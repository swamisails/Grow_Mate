<?php

namespace App\Modules\Mentors\Queries;

use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Mentors\Models\MentorCheckCourse;
use App\Modules\Mentors\Models\Outcome;
use Illuminate\Database\Query\JoinClause;

/**
 * Admin's Registration decisions list (R3): one row per Course named in a Mentor check, by that
 * row's id, with its decision once made. A skipped check has no rows. Carries no route (AD-8).
 */
class RegistrationDecisions
{
    public function __construct(
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
    ) {}

    /**
     * @return list<array{id: int, employee_name: string, course_title: string, outcome: Outcome|null}>
     */
    public function handle(): array
    {
        $named = MentorCheckCourse::query()
            ->join('mentor_checks', 'mentor_checks.id', '=', 'mentor_check_courses.mentor_check_id')
            ->leftJoin('registration_decisions', fn (JoinClause $join) => $join
                ->on('registration_decisions.user_id', '=', 'mentor_checks.user_id')
                ->on('registration_decisions.course_id', '=', 'mentor_check_courses.course_id'))
            ->orderBy('mentor_check_courses.id')
            ->toBase()
            ->get(['mentor_check_courses.id', 'mentor_checks.user_id', 'mentor_check_courses.course_id', 'registration_decisions.outcome']);

        // Names and titles come from their owning modules (AD-3).
        $names = $this->userNames->handle($named->pluck('user_id')->map(fn ($id): int => (int) $id)->unique()->values()->all());
        $titles = $this->courseTitles->handle($named->pluck('course_id')->map(fn ($id): int => (int) $id)->unique()->values()->all());

        return $named->map(fn (object $row): array => [
            'id' => (int) $row->id,
            'employee_name' => $names[(int) $row->user_id] ?? '',
            'course_title' => $titles[(int) $row->course_id] ?? '',
            'outcome' => $row->outcome === null ? null : Outcome::from($row->outcome),
        ])->values()->all();
    }
}
