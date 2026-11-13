<?php

namespace Database\Factories;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Models\MentorRoute;
use App\Modules\Mentors\Models\Route;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * An Employee granted Mentor for a published Course, by Registration approval unless stated.
 *
 * @extends Factory<MentorRoute>
 */
class MentorRouteFactory extends Factory
{
    /**
     * @var class-string<MentorRoute>
     */
    protected $model = MentorRoute::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'course_id' => Course::factory()->state(['published_at' => now()]),
            'route' => Route::RegistrationApproval,
        ];
    }
}
