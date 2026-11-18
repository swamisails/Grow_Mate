<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Actions\AcceptRequest;
use App\Modules\Matching\Http\Resources\MentorMatchResource;
use Illuminate\Http\Request;

class AcceptRequestController
{
    /**
     * The route id is `{request}`. The HTTP request is `$http` so Laravel does not inject the id into it.
     */
    public function __invoke(int $request, Request $http, AcceptRequest $acceptRequest): MentorMatchResource
    {
        $mentorId = (int) $http->user()?->getAuthIdentifier();

        return new MentorMatchResource($acceptRequest->handle($request, $mentorId));
    }
}
