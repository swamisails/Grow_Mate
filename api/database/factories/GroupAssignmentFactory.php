<?php

namespace Database\Factories;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\GroupAssignment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A group assignment of a published Course to one Employee. Its Requests are made separately.
 *
 * @extends Factory<GroupAssignment>
 */
class GroupAssignmentFactory extends Factory
{
    /**
     * @var class-string<GroupAssignment>
     */
    protected $model = GroupAssignment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'course_id' => Course::factory()->state(['published_at' => now()]),
            'mentor_id' => User::factory(),
            'created_at' => now(),
        ];
    }
}
