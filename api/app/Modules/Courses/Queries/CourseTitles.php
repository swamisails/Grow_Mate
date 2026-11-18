<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Course;

/**
 * Course titles keyed by id, for another module's read. Carries no authoring data.
 */
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

        $titles = [];
        foreach (Course::query()->whereIn('id', $courseIds)->pluck('title', 'id') as $id => $title) {
            $titles[(int) $id] = (string) $title;
        }

        return $titles;
    }
}
