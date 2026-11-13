<?php

namespace App\Modules\Mentors\Actions;

use App\Modules\Mentors\Models\MentorRoute;
use App\Modules\Mentors\Models\Route;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class GrantMentor
{
    /**
     * Makes the Employee a Mentor for the Course (AD-7). The only writer of `mentor_routes`.
     *
     * Insert-or-ignore on the (`user_id`, `course_id`) key: a repeat grant changes nothing, so the
     * first route is kept, and a concurrent duplicate insert is the same no-op. Unlike a raw
     * `INSERT IGNORE`, a missing user or Course still fails on its foreign key.
     */
    public function handle(int $userId, int $courseId, Route $route): void
    {
        try {
            // Its own transaction, or a savepoint inside a caller's, so a duplicate rolls back only this insert.
            DB::transaction(fn () => MentorRoute::query()->create([
                'user_id' => $userId,
                'course_id' => $courseId,
                'route' => $route,
            ]));
        } catch (UniqueConstraintViolationException) {
            // The pair is already granted, possibly by a concurrent commit this snapshot can't see:
            // no read-back, the first route stands.
        }
    }
}
