<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use Illuminate\Testing\TestResponse;

abstract class GroupAssignmentTestCase extends MatchingTestCase
{
    protected User $noor;

    protected User $imani;

    protected Course $sql;

    /** @var list<User> */
    protected array $learners;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-11-18 09:00:00');
        $this->noor = User::factory()->admin()->create(['name' => 'Noor Admin']);
        $this->imani = $this->employee('Imani Okafor');
        $this->sql = $this->publishedCourse('SQL Fundamentals');
        $this->learners = array_map(
            fn (string $name): User => $this->employee($name),
            ['Asha Rao', 'Ben Carter', 'Chloe Dubois', 'Dev Patel', 'Elena Ruiz'],
        );
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    protected function assign(array $overrides = []): TestResponse
    {
        return $this->actingAs($this->noor)->postJson('/api/v1/admin/group-assignments', [
            'course_id' => $this->sql->id,
            'mentor_id' => $this->imani->id,
            'learner_ids' => array_map(fn (User $learner): int => $learner->id, $this->learners),
            ...$overrides,
        ]);
    }

    protected function assertNothingCreated(): void
    {
        $this->assertDatabaseCount('group_assignments', 0);
        $this->assertDatabaseCount('requests', 0);
        $this->assertDatabaseCount('notifications', 0);
    }
}
