<?php

namespace App\Modules\Courses\Http\Controllers;

use App\Modules\Courses\Http\Resources\CourseListItemResource;
use App\Modules\Courses\Queries\AdminCourses;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminCoursesController
{
    public function __invoke(AdminCourses $adminCourses): AnonymousResourceCollection
    {
        return CourseListItemResource::collection($adminCourses->handle());
    }
}
