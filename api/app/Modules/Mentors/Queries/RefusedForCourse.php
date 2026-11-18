<?php

namespace App\Modules\Mentors\Queries;

use App\Modules\Mentors\Models\Outcome;
use App\Modules\Mentors\Models\RegistrationDecision;

/**
 * The Employees refused this Course at registration (R3), by id: Admin may not choose them to guide
 * a group on it (UJ-4). Ids only; the decision itself is never returned.
 */
class RefusedForCourse
{
    /**
     * @return list<int>
     */
    public function handle(int $courseId): array
    {
        /** @var list<int> */
        return RegistrationDecision::query()
            ->where('course_id', $courseId)
            ->where('outcome', Outcome::Refused->value)
            ->orderBy('user_id')
            ->pluck('user_id')
            ->map(fn ($id): int => (int) $id)
            ->all();
    }
}
