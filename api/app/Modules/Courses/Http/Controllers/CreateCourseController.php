<?php

namespace App\Modules\Courses\Http\Controllers;

use App\Modules\Courses\Actions\CreateCourse;
use App\Modules\Courses\Http\Requests\CreateCourseRequest;
use App\Modules\Courses\Http\Resources\CourseResource;

class CreateCourseController
{
    public function __invoke(CreateCourseRequest $request, CreateCourse $createCourse): CourseResource
    {
        $course = $createCourse->handle($request->validated('title'), $request->validated('description'));

        // A freshly created model makes the response a 201.
        return new CourseResource($course);
    }
}
