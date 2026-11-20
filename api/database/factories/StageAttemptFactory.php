<?php

namespace Database\Factories;

use App\Modules\Accounts\Models\User;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\Stage;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A passed Bronze attempt on a published Course. Pass `course_id` to attempt an existing Course;
 * the Stage is that Course's Bronze unless `stage_id` is given.
 *
 * @extends Factory<StageAttempt>
 */
class StageAttemptFactory extends Factory
{
    /**
     * @var class-string<StageAttempt>
     */
    protected $model = StageAttempt::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'learner_id' => User::factory(),
            'course_id' => Course::factory()->state(['published_at' => now()]),
            'stage_id' => fn (array $attributes) => Stage::query()
                ->where('course_id', $attributes['course_id'])
                ->where('level', StageLevel::Bronze->value)
                ->value('id'),
            'correct_count' => 1,
            'question_count' => 1,
            'pass_mark' => 70,
            'passed' => true,
            'submitted_at' => now(),
        ];
    }

    /**
     * An attempt that did not reach the Pass mark.
     */
    public function failed(): static
    {
        return $this->state(fn (array $attributes): array => ['correct_count' => 0, 'passed' => false]);
    }
}
