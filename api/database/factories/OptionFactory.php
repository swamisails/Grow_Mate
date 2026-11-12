<?php

namespace Database\Factories;

use App\Modules\Courses\Models\Option;
use App\Modules\Courses\Models\Question;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Option>
 */
class OptionFactory extends Factory
{
    /**
     * @var class-string<Option>
     */
    protected $model = Option::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'question_id' => Question::factory(),
            'position' => 1,
            'text' => fake()->words(2, true),
            'is_correct' => false,
        ];
    }

    public function correct(): static
    {
        return $this->state(fn (array $attributes) => ['is_correct' => true]);
    }
}
