<?php

namespace Database\Factories;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Models\Outcome;
use App\Modules\Mentors\Models\RegistrationDecision;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Admin's decision on a published Course an Employee named, approved unless stated.
 *
 * @extends Factory<RegistrationDecision>
 */
class RegistrationDecisionFactory extends Factory
{
    /**
     * @var class-string<RegistrationDecision>
     */
    protected $model = RegistrationDecision::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'course_id' => Course::factory()->state(['published_at' => now()->subDay()]),
            'outcome' => Outcome::Approved,
        ];
    }

    public function refused(): static
    {
        return $this->state(['outcome' => Outcome::Refused]);
    }
}
