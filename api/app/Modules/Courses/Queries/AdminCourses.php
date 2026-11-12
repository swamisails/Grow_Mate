<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Course;
use Illuminate\Database\Eloquent\Collection;

class AdminCourses
{
    /**
     * Every Course, newest first (by id, AD-4).
     *
     * @return Collection<int, Course>
     */
    public function handle(): Collection
    {
        return Course::query()->orderByDesc('id')->get();
    }
}
