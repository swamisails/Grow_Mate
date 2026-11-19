<?php

namespace Tests\Feature\Matching;

use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Models\MentorRoute;
use App\Modules\Mentors\Models\Route;
use Illuminate\Testing\TestResponse;

class AcceptGroupTest extends GroupAssignmentTestCase
{
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
                'can_complete_course' => false,
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
}
