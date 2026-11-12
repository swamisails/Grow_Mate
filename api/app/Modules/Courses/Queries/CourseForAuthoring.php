<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Course;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * The authoring read (AD-14): the whole Course, including which option is correct. Admin only;
 * the taking read (epic 3) never includes `is_correct`.
 */
class CourseForAuthoring
{
    /**
     * @throws ModelNotFoundException<Course> (a 404) when there is no such Course
     */
    public function handle(int $courseId): Course
    {
        return Course::query()->with('stages.questions.options')->findOrFail($courseId);
    }
}
