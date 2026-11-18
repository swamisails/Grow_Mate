<?php

namespace App\Modules\Progress\Http\Controllers;

use App\Modules\Progress\Http\Resources\CourseProgressResource;
use App\Modules\Progress\Queries\ProgressStatus;
use Illuminate\Http\Request;

class CourseProgressController
{
    public function __invoke(int $course, Request $request, ProgressStatus $progressStatus): CourseProgressResource
    {
        $learnerId = (int) $request->user()?->getAuthIdentifier();

        return new CourseProgressResource($progressStatus->handle($learnerId, $course));
    }
}
