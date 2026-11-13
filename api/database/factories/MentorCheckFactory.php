<?php

namespace Database\Factories;

use App\Modules\Accounts\Models\User;
use App\Modules\Mentors\Models\MentorCheck;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * An Employee's Mentor check; with no Course rows it is a skip.
 *
 * @extends Factory<MentorCheck>
 */
class MentorCheckFactory extends Factory
{
    /**
     * @var class-string<MentorCheck>
     */
    protected $model = MentorCheck::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
        ];
    }
}
