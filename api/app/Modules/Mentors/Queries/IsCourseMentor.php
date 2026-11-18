<?php

namespace App\Modules\Mentors\Queries;

use App\Modules\Mentors\Models\MentorRoute;

/**
 * Whether this Employee is a Mentor for this Course (AD-7). The route itself is never returned (AD-8).
 */
class IsCourseMentor
{
    public function handle(int $courseId, int $userId): bool
    {
        return MentorRoute::query()->where('course_id', $courseId)->where('user_id', $userId)->exists();
    }
}
