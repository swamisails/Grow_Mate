<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Stage;

/**
 * A Course's Stage ids by level (`bronze`, `silver`, `gold`), so other modules can key rows by
 * Stage without reading `stages`. Empty for a missing Course.
 */
class CourseStageIds
{
    /**
     * @return array<string, int>
     */
    public function handle(int $courseId): array
    {
        return Stage::query()
            ->where('course_id', $courseId)
            ->get(['id', 'level'])
            ->mapWithKeys(fn (Stage $stage): array => [$stage->level->value => $stage->id])
            ->all();
    }
}
