<?php

namespace App\Modules\Courses\Http\Controllers;

use App\Modules\Courses\Actions\PublishCourse;
use App\Modules\Courses\Http\Resources\CourseResource;

class PublishCourseController
{
    public function __invoke(int $course, PublishCourse $publishCourse): CourseResource
    {
        return new CourseResource($publishCourse->handle($course));
    }
}
