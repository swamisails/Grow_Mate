<?php

namespace App\Modules\Courses\Http\Controllers;

use App\Modules\Courses\Http\Resources\CourseResource;
use App\Modules\Courses\Queries\CourseForAuthoring;

class ShowCourseController
{
    /**
     * The Course is looked up by the Query, not by route model binding, so the `admin` gate runs
     * first and a non-Admin can't tell a missing Course (404) from an existing one (403).
     */
    public function __invoke(int $course, CourseForAuthoring $courseForAuthoring): CourseResource
    {
        return new CourseResource($courseForAuthoring->handle($course));
    }
}
