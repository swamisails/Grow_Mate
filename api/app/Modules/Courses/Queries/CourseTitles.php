<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Course;

class CourseTitles
{
    /**
     * The title of each Course id that exists, keyed by id. Ids with no Course are left out.
     *
     * @param  list<int>  $courseIds
     * @return array<int, string>
     */
    public function handle(array $courseIds): array
    {
        if ($courseIds === []) {
            return [];
        }

        /** @var array<int, string> */
        return Course::query()->whereIn('id', $courseIds)->pluck('title', 'id')->all();
    }
}
