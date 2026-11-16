<?php

namespace Database\Factories;

use App\Modules\Matching\Models\GroupAssignment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * An unused group row. This entry stores the id and never accepts the group.
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
        return [];
    }
}
