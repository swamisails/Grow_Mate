<?php

namespace Database\Factories;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\Request;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * An open Request from one Employee to another for a published Course.
 *
 * @extends Factory<Request>
 */
class RequestFactory extends Factory
{
    /**
     * @var class-string<Request>
     */
    protected $model = Request::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'learner_id' => User::factory(),
            'mentor_id' => User::factory(),
            'course_id' => Course::factory()->published(),
            'group_assignment_id' => null,
            'sent_at' => now(),
            'accepted_at' => null,
        ];
    }
}
