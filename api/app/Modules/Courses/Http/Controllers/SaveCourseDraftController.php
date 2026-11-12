<?php

namespace App\Modules\Courses\Http\Controllers;

use App\Modules\Courses\Actions\SaveCourseDraft;
use App\Modules\Courses\Http\Requests\SaveCourseDraftRequest;
use App\Modules\Courses\Http\Resources\CourseResource;

class SaveCourseDraftController
{
    /**
     * The Course is looked up by the Action, not by route model binding, so the `admin` gate runs
     * first and a non-Admin can't tell a missing Course (404) from an existing one (403).
     */
    public function __invoke(SaveCourseDraftRequest $request, int $course, SaveCourseDraft $saveCourseDraft): CourseResource
    {
        return new CourseResource($saveCourseDraft->handle($course, $request->validated()));
    }
}
