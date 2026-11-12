<?php

namespace App\Modules\Courses\Actions;

use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Support\Facades\DB;

class CreateCourse
{
    /**
     * A new draft Course with its three empty Stages: Bronze, Silver and Gold.
     */
    public function handle(string $title, ?string $description): Course
    {
        return DB::transaction(function () use ($title, $description): Course {
            $course = Course::query()->create([
                'title' => $title,
                'description' => $description,
            ]);

            foreach (StageLevel::cases() as $level) {
                $course->stages()->create(['level' => $level]);
            }

            return $course->load('stages.questions.options');
        });
    }
}
