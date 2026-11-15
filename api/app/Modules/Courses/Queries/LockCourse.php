<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Course;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Locks one Course row for the caller's transaction. Matching calls this instead of reading `courses`.
 */
class LockCourse
{
    /**
     * Whether the locked Course is published. A missing id is a 404.
     *
     * @throws NotFoundHttpException when there is no Course with this id
     */
    public function handle(int $courseId): bool
    {
        $course = Course::query()->whereKey($courseId)->lockForUpdate()->first(['id', 'published_at']);

        if ($course === null) {
            throw new NotFoundHttpException('Not found.');
        }

        return $course->published_at !== null;
    }
}
