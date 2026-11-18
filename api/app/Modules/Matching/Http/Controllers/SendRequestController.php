<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Actions\SendRequest;
use App\Modules\Matching\Http\Requests\SendCourseRequest;
use App\Modules\Matching\Http\Resources\SentRequestResource;

class SendRequestController
{
    public function __invoke(int $course, SendCourseRequest $request, SendRequest $sendRequest): SentRequestResource
    {
        $learnerId = (int) $request->user()?->getAuthIdentifier();

        return new SentRequestResource($sendRequest->handle($learnerId, $course, $request->mentorId()));
    }
}
