<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\GroupAssignment;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use Illuminate\Testing\TestResponse;

class GroupAssignmentTest extends MatchingTestCase
{
    private User $noor;

    private User $imani;

    private Course $sql;

    /** @var list<User> */
    private array $learners;

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
    private function assign(array $overrides = []): TestResponse
    {
        return $this->actingAs($this->noor)->postJson('/api/v1/admin/group-assignments', [
            'course_id' => $this->sql->id,
            'mentor_id' => $this->imani->id,
            'learner_ids' => array_map(fn (User $learner): int => $learner->id, $this->learners),
            ...$overrides,
        ]);
    }

    private function assertNothingCreated(): void
    {
        $this->assertDatabaseCount('group_assignments', 0);
        $this->assertDatabaseCount('requests', 0);
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_assign_creates_one_assignment_and_a_pending_request_per_learner_with_one_sent_time(): void
    {
        $response = $this->assign();

        $response->assertCreated()->assertExactJson(['data' => [
            'course_title' => 'SQL Fundamentals',
            'mentor_name' => 'Imani Okafor',
            'learner_names' => ['Asha Rao', 'Ben Carter', 'Chloe Dubois', 'Dev Patel', 'Elena Ruiz'],
            'created_at' => '2026-11-18T09:00:00.000000Z',
        ]]);
        $this->assertHidesRouteAndGroup($response);
        $body = $response->getContent();
        foreach (['"id"', 'sent_at', 'accepted_at', 'status', 'match', 'request'] as $secret) {
            $this->assertStringNotContainsString($secret, $body);
        }

        $assignment = GroupAssignment::query()->sole();
        $this->assertSame($this->sql->id, $assignment->course_id);
        $this->assertSame($this->imani->id, $assignment->mentor_id);
        $this->assertSame('2026-11-18 09:00:00', $assignment->created_at->toDateTimeString());

        $requests = Request::query()->orderBy('id')->get();
        $this->assertCount(5, $requests);
        $this->assertSame(array_map(fn (User $learner): int => $learner->id, $this->learners), $requests->pluck('learner_id')->all());
        foreach ($requests as $request) {
            $this->assertSame($this->imani->id, $request->mentor_id);
            $this->assertSame($this->sql->id, $request->course_id);
            $this->assertSame($assignment->id, $request->group_assignment_id);
            $this->assertTrue($request->sent_at->equalTo($assignment->created_at));
            $this->assertNull($request->accepted_at);
        }
        $this->assertSame(0, MentorMatch::query()->count());

        $inbox = $this->actingAs($this->imani)->getJson('/api/v1/notices')->assertOk();
        $this->assertHidesRouteAndGroup($inbox);
        $this->assertSame(array_fill(0, 5, 'request_sent'), array_column($inbox->json('data'), 'type'));
        $this->assertEqualsCanonicalizing(
            ['Asha Rao', 'Ben Carter', 'Chloe Dubois', 'Dev Patel', 'Elena Ruiz'],
            array_column($inbox->json('data'), 'person_name'),
        );
        $this->assertSame(array_fill(0, 5, 'SQL Fundamentals'), array_column($inbox->json('data'), 'course_title'));
        $this->assertSame(['id', 'type', 'occurred_at', 'person_name', 'course_title'], array_keys($inbox->json('data.0')));
        $this->assertDatabaseCount('notifications', 5);
    }

    public function test_the_chosen_employee_sees_the_group_as_one_row_beside_ordinary_requests(): void
    {
        $python = $this->publishedCourse('Python Basics');
        $priya = $this->employee('Priya Nair');
        $this->grant($this->imani, $python);
        $this->actingAs($priya)->postJson("/api/v1/courses/{$python->id}/requests", ['mentor_id' => $this->imani->id])->assertCreated();
        $this->assign()->assertCreated();
        $first = Request::query()->whereNotNull('group_assignment_id')->min('id');
        $single = Request::query()->whereNull('group_assignment_id')->sole();

        $list = $this->actingAs($this->imani)->getJson('/api/v1/requests');

        $list->assertOk()->assertExactJson(['data' => [
            ['id' => $single->id, 'learner_name' => 'Priya Nair', 'course_title' => 'Python Basics'],
            [
                'id' => $first,
                'learner_names' => ['Asha Rao', 'Ben Carter', 'Chloe Dubois', 'Dev Patel', 'Elena Ruiz'],
                'course_title' => 'SQL Fundamentals',
            ],
        ]]);
        $this->assertHidesRouteAndGroup($list);

        // Only the chosen Employee's own Requests screen shows the group.
        foreach ([$priya, ...$this->learners] as $other) {
            $this->actingAs($other)->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => []]);
        }
    }

    public function test_accepting_the_group_is_still_refused_and_accepts_nothing(): void
    {
        config(['app.debug' => false]);
        $this->assign()->assertCreated();
        $first = (int) Request::query()->min('id');

        $response = $this->actingAs($this->imani)->postJson("/api/v1/requests/{$first}/accept");

        $response->assertNotFound()->assertExactJson(['message' => 'Not found.']);
        $this->assertSame(0, MentorMatch::query()->count());
        $this->assertSame(5, Request::query()->whereNull('accepted_at')->count());
        $this->assertCount(1, $this->actingAs($this->imani)->getJson('/api/v1/requests')->json('data'));
    }

    public function test_a_draft_course_is_refused_and_nothing_is_created(): void
    {
        $draft = Course::factory()->create(['title' => 'Draft Course']);

        $response = $this->assign(['course_id' => $draft->id]);

        $response->assertConflict()->assertExactJson([
            'message' => "This course isn't published.",
            'code' => 'MATCHING_COURSE_NOT_PUBLISHED',
        ]);
        $this->assertNothingCreated();
    }

    public function test_an_empty_learner_list_is_a_422_on_learner_ids(): void
    {
        $this->assign(['learner_ids' => []])->assertUnprocessable()->assertOnlyJsonValidationErrors(['learner_ids']);
        $this->assertNothingCreated();
    }

    public function test_an_unknown_or_admin_id_is_a_422_on_its_field(): void
    {
        $learnerIds = array_map(fn (User $learner): int => $learner->id, $this->learners);

        $this->assign(['mentor_id' => 999999])->assertUnprocessable()->assertOnlyJsonValidationErrors(['mentor_id']);
        $this->assign(['mentor_id' => $this->noor->id])->assertUnprocessable()->assertOnlyJsonValidationErrors(['mentor_id']);
        $this->assign(['learner_ids' => [...$learnerIds, 999999]])->assertUnprocessable()->assertOnlyJsonValidationErrors(['learner_ids']);
        $this->assign(['learner_ids' => [$learnerIds[0], $this->noor->id]])->assertUnprocessable()->assertOnlyJsonValidationErrors(['learner_ids']);
        $this->assign(['course_id' => 999999])->assertUnprocessable()->assertOnlyJsonValidationErrors(['course_id']);
        $this->assign(['learner_ids' => [$learnerIds[0], $learnerIds[0]]])->assertUnprocessable()->assertJsonValidationErrors(['learner_ids.1']);
        $this->assign(['course_id' => (string) $this->sql->id])->assertUnprocessable()->assertOnlyJsonValidationErrors(['course_id']);

        $this->assertNothingCreated();
    }

    public function test_an_employee_or_a_guest_cannot_assign(): void
    {
        $this->postJson('/api/v1/admin/group-assignments', [])->assertUnauthorized();

        $this->actingAs($this->imani)->postJson('/api/v1/admin/group-assignments', [
            'course_id' => $this->sql->id,
            'mentor_id' => $this->imani->id,
            'learner_ids' => [$this->learners[0]->id],
        ])->assertForbidden();

        $this->assertNothingCreated();
    }

    public function test_after_144_hours_the_group_row_is_gone(): void
    {
        $this->assign()->assertCreated();

        $this->travelTo(now()->addHours(143)->addMinutes(59));
        $this->assertCount(1, $this->actingAs($this->imani)->getJson('/api/v1/requests')->json('data'));

        $this->travelTo(now()->addMinute());
        $this->actingAs($this->imani)->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_the_learner_gets_no_notice_and_no_request_button_and_sees_nothing_of_the_group(): void
    {
        $this->grant($this->employee('Rafi Haddad'), $this->sql);
        $this->assign()->assertCreated();
        $asha = $this->learners[0];
        $this->actingAs($asha);

        $notices = $this->getJson('/api/v1/notices');
        $notices->assertOk()->assertExactJson(['data' => []]);

        $home = $this->getJson('/api/v1/home');
        $home->assertOk()->assertExactJson(['data' => [
            'learning' => [[
                'course_id' => $this->sql->id,
                'course_title' => 'SQL Fundamentals',
                'status' => 'not_yet_started',
                'match_id' => null,
            ]],
            'mentoring' => [],
        ]]);

        $progress = $this->getJson("/api/v1/courses/{$this->sql->id}/progress");
        $progress->assertOk()->assertExactJson(['data' => ['status' => 'not_yet_started']]);

        $eligibility = $this->getJson("/api/v1/courses/{$this->sql->id}/request-eligibility");
        $eligibility->assertOk()->assertExactJson(['data' => ['can_request' => false]]);

        foreach ([$notices, $home, $progress, $eligibility] as $response) {
            $this->assertHidesRouteAndGroup($response);
        }
    }

    public function test_no_learner_facing_body_carries_the_group(): void
    {
        $this->grant($this->employee('Rafi Haddad'), $this->sql);
        $this->assign()->assertCreated();

        foreach ($this->learners as $learner) {
            $this->actingAs($learner);
            foreach ([
                '/api/v1/home',
                '/api/v1/notices',
                '/api/v1/requests',
                '/api/v1/courses',
                "/api/v1/courses/{$this->sql->id}",
                "/api/v1/courses/{$this->sql->id}/mentors",
                "/api/v1/courses/{$this->sql->id}/progress",
                "/api/v1/courses/{$this->sql->id}/request-eligibility",
            ] as $path) {
                $response = $this->getJson($path)->assertOk();
                $this->assertHidesRouteAndGroup($response);
                $this->assertStringNotContainsString('learner_names', $response->getContent());
                $this->assertStringNotContainsString('Imani Okafor', $response->getContent());
            }
        }
    }
}
