<?php

namespace App\Modules\Assessments\Http\Controllers;

use App\Modules\Assessments\Http\Resources\StageStateResource;
use App\Modules\Assessments\Queries\CourseStages;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CourseStagesController
{
    /**
     * The Stages the Learner has reached on a published Course; a draft or missing Course is a 404.
     */
    public function __invoke(int $course, Request $request, CourseStages $courseStages): AnonymousResourceCollection
    {
        $learnerId = (int) $request->user()?->getAuthIdentifier();

        return StageStateResource::collection($courseStages->handle($learnerId, $course));
    }
}
