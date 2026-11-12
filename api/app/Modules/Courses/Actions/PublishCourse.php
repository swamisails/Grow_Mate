<?php

namespace App\Modules\Courses\Actions;

use App\Modules\Courses\ErrorCode;
use App\Modules\Courses\Exceptions\CourseRuleViolation;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Queries\CourseForAuthoring;
use App\Modules\Courses\Queries\PublishEligibility;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

class PublishCourse
{
    public function __construct(
        private readonly PublishEligibility $eligibility,
        private readonly CourseForAuthoring $courseForAuthoring,
    ) {}

    /**
     * Publishes the Course's saved content. It locks the same row as SaveCourseDraft, so a Save and a
     * Publish of one Course never interleave; once published the Course is frozen (AD-14).
     *
     * @throws ModelNotFoundException<Course> (a 404) when there is no such Course
     * @throws CourseRuleViolation (a 409) when it is already published or its saved content is incomplete
     */
    public function handle(int $courseId): Course
    {
        DB::transaction(function () use ($courseId): void {
            $course = Course::query()->whereKey($courseId)->lockForUpdate()->firstOrFail();

            if ($course->published_at !== null) {
                throw new CourseRuleViolation(ErrorCode::Published);
            }
            if (! $this->eligibility->handle($course)) {
                throw new CourseRuleViolation(ErrorCode::Incomplete);
            }

            // `published_at` is not mass assignable: only this Action sets it.
            $course->published_at = now();
            $course->save();
        });

        return $this->courseForAuthoring->handle($courseId);
    }
}
