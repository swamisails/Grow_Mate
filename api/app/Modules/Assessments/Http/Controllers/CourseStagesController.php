<?php

namespace App\Modules\Assessments\Http\Controllers;

use App\Modules\Assessments\Http\Resources\StageStateResource;
use App\Modules\Assessments\Queries\StageAvailability;
use App\Modules\Courses\Queries\PublishedCourse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CourseStagesController
{
    /**
     * The Stages the Learner has reached on a published Course; a draft or missing Course is a 404.
     */
    public function __invoke(int $course, Request $request, PublishedCourse $publishedCourse, StageAvailability $stageAvailability): AnonymousResourceCollection
    {
        $publishedCourse->handle($course);
        $learnerId = (int) $request->user()?->getAuthIdentifier();

        return StageStateResource::collection($stageAvailability->handle($learnerId, $course));
    }
}
