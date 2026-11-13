<?php

namespace App\Modules\Mentors\Http\Controllers;

use App\Modules\Mentors\Http\Resources\CourseMentorResource;
use App\Modules\Mentors\Queries\CourseMentors;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CourseMentorsController
{
    public function __invoke(int $course, Request $request, CourseMentors $courseMentors): AnonymousResourceCollection
    {
        $viewerId = (int) $request->user()?->getAuthIdentifier();

        return CourseMentorResource::collection($courseMentors->handle($course, $viewerId));
    }
}
