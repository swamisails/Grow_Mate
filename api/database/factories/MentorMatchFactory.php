<?php

namespace Database\Factories;

use App\Modules\Matching\Models\MatchEndReason;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * The Match Accept creates for one Request.
 *
 * @extends Factory<MentorMatch>
 */
class MentorMatchFactory extends Factory
{
    /**
     * @var class-string<MentorMatch>
     */
    protected $model = MentorMatch::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'request_id' => Request::factory(),
            'started_at' => now(),
            'ended_at' => null,
            'end_reason' => null,
        ];
    }

    /**
     * A Match ended because Course Completed was clicked.
     */
    public function courseCompleted(): static
    {
        return $this->state(fn (array $attributes): array => [
            'ended_at' => now(),
            'end_reason' => MatchEndReason::CourseCompleted,
        ]);
    }
}
