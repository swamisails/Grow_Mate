<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Course;
use Illuminate\Database\Eloquent\Collection;

/**
 * The Employee Courses list: published Courses only, newest first (by id, AD-4). Selects no
 * assessment or authoring data.
 */
class PublishedCourses
{
    /**
     * @return Collection<int, Course>
     */
    public function handle(): Collection
    {
        return Course::query()->whereNotNull('published_at')->orderByDesc('id')->get(['id', 'title', 'description']);
    }
}
