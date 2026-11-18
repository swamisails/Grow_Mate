<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Actions\AssignGroup;
use App\Modules\Matching\Http\Requests\AssignGroupRequest;
use App\Modules\Matching\Http\Resources\GroupAssignmentResource;
use Illuminate\Http\JsonResponse;

class AssignGroupController
{
    public function __invoke(AssignGroupRequest $request, AssignGroup $assignGroup): JsonResponse
    {
        return (new GroupAssignmentResource($assignGroup->handle($request->courseId(), $request->mentorId(), $request->learnerIds())))
            ->response()
            ->setStatusCode(201);
    }
}
