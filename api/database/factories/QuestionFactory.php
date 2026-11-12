<?php

namespace Database\Factories;

use App\Modules\Courses\Models\Question;
use App\Modules\Courses\Models\Stage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Question>
 */
class QuestionFactory extends Factory
{
    /**
     * @var class-string<Question>
     */
    protected $model = Question::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'stage_id' => Stage::factory(),
            'position' => 1,
            'text' => fake()->sentence().'?',
        ];
    }
}
