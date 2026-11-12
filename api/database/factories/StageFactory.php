<?php

namespace Database\Factories;

use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\Stage;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Stages normally come with their Course (CourseFactory); use this only for a Stage on its own.
 *
 * @extends Factory<Stage>
 */
class StageFactory extends Factory
{
    /**
     * @var class-string<Stage>
     */
    protected $model = Stage::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Not Course::factory(): that already gives the Course its three Stages.
            'course_id' => fn () => Course::query()->create(['title' => fake()->words(3, true)])->id,
            'level' => StageLevel::Bronze,
            'pass_mark' => null,
        ];
    }
}
