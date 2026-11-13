<?php

namespace App\Modules\Mentors\Http\Controllers;

use App\Modules\Mentors\Actions\SubmitMentorCheck;
use App\Modules\Mentors\Http\Requests\SubmitMentorCheckRequest;
use App\Modules\Mentors\Http\Resources\MentorCheckResource;
use Illuminate\Http\JsonResponse;

class SubmitMentorCheckController
{
    public function __invoke(SubmitMentorCheckRequest $request, SubmitMentorCheck $submitMentorCheck): JsonResponse
    {
        $userId = (int) $request->user()?->getAuthIdentifier();

        $submitMentorCheck->handle($userId, $request->courseIds());

        // Once the Action succeeds the check is done, so there are no Courses left to offer.
        return (new MentorCheckResource(['pending' => false, 'courses' => []]))->response()->setStatusCode(201);
    }
}
