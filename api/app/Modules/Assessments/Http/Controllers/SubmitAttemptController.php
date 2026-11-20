<?php

namespace App\Modules\Assessments\Http\Controllers;

use App\Modules\Assessments\Actions\SubmitAttempt;
use App\Modules\Assessments\Http\Requests\SubmitAttemptRequest;
use App\Modules\Assessments\Http\Resources\AttemptResultResource;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Http\JsonResponse;

class SubmitAttemptController
{
    public function __invoke(int $course, string $stage, SubmitAttemptRequest $request, SubmitAttempt $submitAttempt): JsonResponse
    {
        $learnerId = (int) $request->user()?->getAuthIdentifier();
        $attempt = $submitAttempt->handle($learnerId, $course, StageLevel::from($stage), $request->answers());

        return (new AttemptResultResource($attempt))->response()->setStatusCode(201);
    }
}
