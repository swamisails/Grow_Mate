<?php

namespace App\Modules\Mentors\Http\Controllers;

use App\Modules\Mentors\Http\Resources\MentorCheckResource;
use App\Modules\Mentors\Queries\MentorCheckStatus;
use Illuminate\Http\Request;

class MentorCheckController
{
    public function __invoke(Request $request, MentorCheckStatus $mentorCheckStatus): MentorCheckResource
    {
        $userId = (int) $request->user()?->getAuthIdentifier();

        return new MentorCheckResource($mentorCheckStatus->handle($userId));
    }
}
