<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\GroupAssignment;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Models\MentorRoute;
use App\Modules\Mentors\Models\Route;
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

    /**
     * Assigns the group, then Imani Accepts it through the Request id at `$position`.
     */
    private function acceptGroupAt(int $position): TestResponse
    {
        $this->assign()->assertCreated();
        $ids = Request::query()->orderBy('id')->pluck('id')->all();

        return $this->actingAs($this->imani)->postJson("/api/v1/requests/{$ids[$position]}/accept");
    }

    /**
     * Every Learner has one accepted Request, one live Match, one Accept notice and an `in_progress`
     * Home row, each shaped like a one-to-one Match's; the chosen Employee is the Course's Mentor.
     */
    private function assertWholeGroupAccepted(): void
    {
        $requests = Request::query()->orderBy('id')->get();
        $this->assertCount(5, $requests);
        $this->assertSame(0, $requests->whereNull('accepted_at')->count());
        $this->assertSame(5, MentorMatch::query()->count());
        $this->assertSame(5, MentorMatch::query()->whereNull('ended_at')->distinct()->count('request_id'));

        foreach ($this->learners as $learner) {
            $match = MentorMatch::query()
                ->where('request_id', $requests->firstWhere('learner_id', $learner->id)->id)
                ->sole();
            $this->actingAs($learner);

            $notices = $this->getJson('/api/v1/notices')->assertOk();
            $this->assertSame(['request_accepted'], array_column($notices->json('data'), 'type'));
            $this->assertSame(['id', 'type', 'occurred_at', 'person_name', 'course_title'], array_keys($notices->json('data.0')));
            $this->assertSame('Imani Okafor', $notices->json('data.0.person_name'));
            $this->assertSame('SQL Fundamentals', $notices->json('data.0.course_title'));

            $home = $this->getJson('/api/v1/home')->assertOk()->assertExactJson(['data' => [
                'learning' => [[
                    'course_id' => $this->sql->id,
                    'course_title' => 'SQL Fundamentals',
                    'status' => 'in_progress',
                    'match_id' => $match->id,
                ]],
                'mentoring' => [],
            ]]);

            $read = $this->getJson("/api/v1/matches/{$match->id}")->assertOk()->assertExactJson(['data' => [
                'person_name' => 'Imani Okafor',
                'course_title' => 'SQL Fundamentals',
                'status' => 'in_progress',
            ]]);

            foreach ([$notices, $home, $read] as $response) {
                $this->assertHidesRouteAndGroup($response);
                $this->assertStringNotContainsString('learner_names', $response->getContent());
            }
        }

        // The chosen Employee gets no Accept notice: only the five Request notices from Assign.
        $this->actingAs($this->imani);
        $inbox = $this->getJson('/api/v1/notices')->assertOk();
        $this->assertSame(array_fill(0, 5, 'request_sent'), array_column($inbox->json('data'), 'type'));
        $this->assertDatabaseCount('notifications', 10);

        $this->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => []]);
        $mentoring = $this->getJson('/api/v1/home')->assertOk();
        $this->assertCount(5, $mentoring->json('data.mentoring'));
        $this->assertHidesRouteAndGroup($mentoring);

        $mentors = $this->actingAs($this->learners[0])->getJson("/api/v1/courses/{$this->sql->id}/mentors");
        $mentors->assertOk()->assertExactJson(['data' => [['id' => $this->imani->id, 'name' => 'Imani Okafor']]]);
        $this->assertHidesRouteAndGroup($mentors);
    }

    public function test_one_accept_starts_every_match_in_the_group_and_grants_the_chosen_employee(): void
    {
        $response = $this->acceptGroupAt(0);

        $first = Request::query()->orderBy('id')->first();
        $response->assertCreated()->assertExactJson(['data' => [
            'id' => MentorMatch::query()->where('request_id', $first->id)->value('id'),
            'request_id' => $first->id,
            'started_at' => '2026-11-18T09:00:00.000000Z',
        ]]);
        $this->assertHidesRouteAndGroup($response);
        $this->assertWholeGroupAccepted();

        $grant = MentorRoute::query()->sole();
        $this->assertSame(
            [$this->imani->id, $this->sql->id, Route::GroupAssignmentAccepted],
            [$grant->user_id, $grant->course_id, $grant->route],
        );
    }

    public function test_any_sibling_id_accepts_the_whole_group_and_returns_its_own_match(): void
    {
        $response = $this->acceptGroupAt(2);

        $third = Request::query()->orderBy('id')->skip(2)->first();
        $response->assertCreated()->assertExactJson(['data' => [
            'id' => MentorMatch::query()->where('request_id', $third->id)->value('id'),
            'request_id' => $third->id,
            'started_at' => '2026-11-18T09:00:00.000000Z',
        ]]);
        $this->assertHidesRouteAndGroup($response);
        $this->assertWholeGroupAccepted();
    }

    public function test_a_second_accept_on_the_group_creates_nothing(): void
    {
        config(['app.debug' => false]);
        $this->acceptGroupAt(0)->assertCreated();

        foreach (Request::query()->orderBy('id')->pluck('id') as $id) {
            $this->actingAs($this->imani)->postJson("/api/v1/requests/{$id}/accept")
                ->assertNotFound()
                ->assertExactJson(['message' => 'Not found.']);
        }

        $this->assertWholeGroupAccepted();
        $this->assertSame(1, MentorRoute::query()->count());
    }

    public function test_another_employee_accepting_the_group_accepts_nothing(): void
    {
        config(['app.debug' => false]);
        $stranger = $this->employee('Sam Lindqvist');
        $this->assign()->assertCreated();

        foreach (Request::query()->orderBy('id')->pluck('id') as $id) {
            $this->actingAs($stranger)->postJson("/api/v1/requests/{$id}/accept")
                ->assertNotFound()
                ->assertExactJson(['message' => 'Not found.']);
        }

        $this->assertSame(5, Request::query()->whereNull('accepted_at')->count());
        $this->assertSame(0, MentorMatch::query()->count());
        $this->assertSame(0, MentorRoute::query()->count());
        $this->assertDatabaseCount('notifications', 5);
        $this->assertCount(1, $this->actingAs($this->imani)->getJson('/api/v1/requests')->json('data'));
    }

    public function test_on_day_3_every_learner_and_the_chosen_employee_per_learner_are_reminded_and_the_row_stays(): void
    {
        $this->assign()->assertCreated();
        $requests = Request::query()->orderBy('id')->get();

        $this->travelTo(now()->addHours(72));

        $occurredAt = '2026-11-21T09:00:00Z';
        foreach ($this->learners as $learner) {
            $request = $requests->firstWhere('learner_id', $learner->id);
            $notices = $this->actingAs($learner)->getJson('/api/v1/notices');
            $notices->assertOk()->assertExactJson(['data' => [[
                'id' => 'request_reminder_day3:'.$request->id,
                'type' => 'request_reminder_day3',
                'occurred_at' => $occurredAt,
                'party' => 'learner',
                'person_name' => 'Imani Okafor',
                'course_title' => 'SQL Fundamentals',
            ]]]);
            $this->assertHidesRouteAndGroup($notices);
        }

        $inbox = $this->actingAs($this->imani)->getJson('/api/v1/notices')->assertOk();
        $this->assertHidesRouteAndGroup($inbox);
        $reminders = array_values(array_filter($inbox->json('data'), fn (array $notice): bool => $notice['type'] === 'request_reminder_day3'));
        $this->assertEqualsCanonicalizing(
            $requests->map(fn (Request $request): string => 'request_reminder_day3:'.$request->id)->all(),
            array_column($reminders, 'id'),
        );
        $this->assertEqualsCanonicalizing(
            ['Asha Rao', 'Ben Carter', 'Chloe Dubois', 'Dev Patel', 'Elena Ruiz'],
            array_column($reminders, 'person_name'),
        );
        $this->assertSame(array_fill(0, 5, 'mentor'), array_column($reminders, 'party'));

        $this->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => [[
            'id' => $requests->first()->id,
            'learner_names' => ['Asha Rao', 'Ben Carter', 'Chloe Dubois', 'Dev Patel', 'Elena Ruiz'],
            'course_title' => 'SQL Fundamentals',
        ]]]);
    }

    public function test_on_day_6_the_group_is_cancelled_together_and_grants_nothing(): void
    {
        config(['app.debug' => false]);
        $this->assign()->assertCreated();
        $requests = Request::query()->orderBy('id')->get();

        $this->travelTo(now()->addHours(144));

        $occurredAt = '2026-11-24T09:00:00Z';
        foreach ($this->learners as $learner) {
            $request = $requests->firstWhere('learner_id', $learner->id);
            $notices = $this->actingAs($learner)->getJson('/api/v1/notices')->assertOk();
            $this->assertHidesRouteAndGroup($notices);
            $this->assertContains([
                'id' => 'request_cancelled_day6:'.$request->id,
                'type' => 'request_cancelled_day6',
                'occurred_at' => $occurredAt,
                'party' => 'learner',
                'person_name' => 'Imani Okafor',
                'course_title' => 'SQL Fundamentals',
            ], $notices->json('data'));
        }

        $this->actingAs($this->imani);
        $inbox = $this->getJson('/api/v1/notices')->assertOk();
        $this->assertHidesRouteAndGroup($inbox);
        $cancellations = array_values(array_filter($inbox->json('data'), fn (array $notice): bool => $notice['type'] === 'request_cancelled_day6'));
        $this->assertEqualsCanonicalizing(
            $requests->map(fn (Request $request): string => 'request_cancelled_day6:'.$request->id)->all(),
            array_column($cancellations, 'id'),
        );
        $this->assertSame(array_fill(0, 5, 'mentor'), array_column($cancellations, 'party'));

        $this->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => []]);
        foreach ($requests as $request) {
            $this->postJson("/api/v1/requests/{$request->id}/accept")
                ->assertNotFound()
                ->assertExactJson(['message' => 'Not found.']);
        }

        $this->assertSame(5, Request::query()->whereNull('accepted_at')->count());
        $this->assertSame(0, MentorMatch::query()->count());
        $this->assertSame(0, MentorRoute::query()->count());
        $this->actingAs($this->learners[0])->getJson("/api/v1/courses/{$this->sql->id}/mentors")
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_a_chosen_employee_who_already_mentors_keeps_her_first_route(): void
    {
        $this->grant($this->imani, $this->sql, Route::RegistrationApproval);

        $this->acceptGroupAt(0)->assertCreated();

        $this->assertWholeGroupAccepted();
        $grant = MentorRoute::query()->sole();
        $this->assertSame(
            [$this->imani->id, $this->sql->id, Route::RegistrationApproval],
            [$grant->user_id, $grant->course_id, $grant->route],
        );
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
