<?php

namespace App\Modules\Courses\Http\Controllers;

use App\Modules\Courses\Http\Resources\PublishedCourseResource;
use App\Modules\Courses\Queries\PublishedCourses;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublishedCoursesController
{
    public function __invoke(PublishedCourses $publishedCourses): AnonymousResourceCollection
    {
        return PublishedCourseResource::collection($publishedCourses->handle());
    }
}
