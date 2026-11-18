<?php

namespace App\Modules\Mentors\Http\Controllers;

use App\Modules\Mentors\Http\Resources\RefusedEmployeeResource;
use App\Modules\Mentors\Queries\RefusedForCourse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RefusedEmployeesController
{
    public function __invoke(int $course, RefusedForCourse $refusedForCourse): AnonymousResourceCollection
    {
        return RefusedEmployeeResource::collection($refusedForCourse->handle($course));
    }
}
