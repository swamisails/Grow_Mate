<?php

namespace App\Modules\Assessments\Http\Controllers;

use App\Modules\Assessments\Http\Resources\AssessmentResource;
use App\Modules\Assessments\Queries\AssessmentForLearner;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Http\Request;

class ShowAssessmentController
{
    /**
     * The taking read, only while the Stage is available to the Learner (else a 409). A draft or
     * missing Course is a 404 first.
     */
    public function __invoke(int $course, string $stage, Request $request, AssessmentForLearner $assessmentForLearner): AssessmentResource
    {
        $level = StageLevel::from($stage);

        return new AssessmentResource($assessmentForLearner->handle((int) $request->user()?->getAuthIdentifier(), $course, $level));
    }
}
