<?php

namespace Database\Factories;

use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Models\MentorCheck;
use App\Modules\Mentors\Models\MentorCheckCourse;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A published Course named in a Mentor check.
 *
 * @extends Factory<MentorCheckCourse>
 */
class MentorCheckCourseFactory extends Factory
{
    /**
     * @var class-string<MentorCheckCourse>
     */
    protected $model = MentorCheckCourse::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mentor_check_id' => MentorCheck::factory(),
            'course_id' => Course::factory()->state(['published_at' => now()->subDay()]),
        ];
    }
}
