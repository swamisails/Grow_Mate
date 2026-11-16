<?php

namespace App\Modules\Mentors\Queries;

use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Mentors\Models\MentorCheckCourse;
use App\Modules\Mentors\Models\Outcome;
use Illuminate\Database\Query\JoinClause;

/**
 * An Employee's own Registration decisions (R3, AD-8 exception 2): whether their Mentor check named
 * any Course, then the Courses Admin approved and refused, each list by title then id. A Course not
 * yet decided is in neither list. Carries no route, date or comment.
 */
class EmployeeRegistrationDecisions
{
    public function __construct(private readonly CourseTitles $courseTitles) {}

    /**
     * @return array{named: bool, approved: list<array{id: int, title: string}>, refused: list<array{id: int, title: string}>}
     */
    public function handle(int $userId): array
    {
        $named = MentorCheckCourse::query()
            ->join('mentor_checks', 'mentor_checks.id', '=', 'mentor_check_courses.mentor_check_id')
            ->leftJoin('registration_decisions', fn (JoinClause $join) => $join
                ->on('registration_decisions.user_id', '=', 'mentor_checks.user_id')
                ->on('registration_decisions.course_id', '=', 'mentor_check_courses.course_id'))
            ->where('mentor_checks.user_id', $userId)
            ->toBase()
            ->get(['mentor_check_courses.course_id', 'registration_decisions.outcome']);

        $decided = $named->whereNotNull('outcome');
        // Titles come from their owning module (AD-3).
        $titles = $this->courseTitles->handle($decided->pluck('course_id')->map(fn ($id): int => (int) $id)->unique()->values()->all());

        $lists = [Outcome::Approved->value => [], Outcome::Refused->value => []];
        foreach ($decided as $row) {
            $lists[$row->outcome][] = ['id' => (int) $row->course_id, 'title' => $titles[(int) $row->course_id] ?? ''];
        }

        foreach ($lists as &$courses) {
            // Sorted here, not in SQL, so the order is the same on every database collation.
            usort($courses, fn (array $a, array $b): int => strcasecmp($a['title'], $b['title']) ?: $a['id'] <=> $b['id']);
        }
        unset($courses);

        return [
            'named' => $named->isNotEmpty(),
            'approved' => $lists[Outcome::Approved->value],
            'refused' => $lists[Outcome::Refused->value],
        ];
    }
}
