<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Course;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * One published Course for an Employee. A draft and a missing id give the same 404, so a draft's
 * existence can't be inferred.
 */
class PublishedCourse
{
    /**
     * @throws NotFoundHttpException when there is no published Course with this id
     */
    public function handle(int $courseId): Course
    {
        $course = Course::query()->whereNotNull('published_at')->find($courseId, ['id', 'title', 'description']);

        abort_if($course === null, 404, 'Not found.');

        return $course;
    }
}
