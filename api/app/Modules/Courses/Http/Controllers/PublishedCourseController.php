<?php

namespace App\Modules\Courses\Http\Controllers;

use App\Modules\Courses\Http\Resources\PublishedCourseResource;
use App\Modules\Courses\Queries\PublishedCourse;

class PublishedCourseController
{
    public function __invoke(int $course, PublishedCourse $publishedCourse): PublishedCourseResource
    {
        return new PublishedCourseResource($publishedCourse->handle($course));
    }
}
