<?php

namespace Database\Factories;

use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A draft Course with its three empty Stages, as `CreateCourse` makes it.
 *
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    /**
     * @var class-string<Course>
     */
    protected $model = Course::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->unique()->words(3, true),
            'description' => fake()->sentence(),
            'published_at' => null,
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Course $course) {
            foreach (StageLevel::cases() as $level) {
                $course->stages()->create(['level' => $level]);
            }
        });
    }
}
