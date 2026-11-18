<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\GroupAssignment;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Models\MentorRoute;
use App\Modules\Mentors\Models\Route;
use Illuminate\Support\Facades\DB;

class AcceptRequestTest extends MatchingTestCase
{
    public function test_an_employee_with_no_requests_gets_an_empty_list(): void
    {
        $response = $this->actingAs($this->employee('Rafi Haddad'))->getJson('/api/v1/requests');

        $response->assertOk()->assertExactJson(['data' => []]);
        $this->assertHidesRouteAndGroup($response);
    }

    public function test_the_addressed_mentor_accepts_and_can_accept_another_learner(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $leo = $this->employee('Leo Martins');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);
        $first = $this->openRequest($priya, $rafi, $course);
        $second = $this->openRequest($leo, $rafi, $course);

        $list = $this->actingAs($rafi)->getJson('/api/v1/requests');
        $list->assertOk()->assertExactJson(['data' => [
            ['id' => $first->id, 'learner_name' => 'Priya Nair', 'course_title' => 'Python Basics'],
            ['id' => $second->id, 'learner_name' => 'Leo Martins', 'course_title' => 'Python Basics'],
        ]]);
        $this->assertHidesRouteAndGroup($list);

        $accepted = $this->postJson("/api/v1/requests/{$first->id}/accept");
        $accepted->assertCreated()->assertExactJson(['data' => [
            'id' => $accepted->json('data.id'),
            'request_id' => $first->id,
            'started_at' => now()->utc()->toJSON(),
        ]]);
        $this->assertHidesRouteAndGroup($accepted);
        $this->assertNotNull($first->fresh()->accepted_at);
        $this->assertSame(1, MentorMatch::query()->count());
        $this->assertSame(1, MentorRoute::query()->count());
        $match = MentorMatch::query()->where('request_id', $first->id)->first();
        $this->assertNotNull($match);
        $this->assertNull($match->ended_at);
        $this->assertNull($match->end_reason);

        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertOk()
            ->assertExactJson(['data' => ['status' => 'in_progress']]);
        $eligibility = $this->getJson("/api/v1/courses/{$course->id}/request-eligibility");
        $eligibility->assertOk()->assertExactJson(['data' => ['can_request' => false]]);
        $this->assertHidesRouteAndGroup($eligibility);

        $again = $this->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $rafi->id]);
        $again->assertConflict()->assertExactJson([
            'message' => 'You already have a match for this course.',
            'code' => 'MATCHING_MATCH_LIVE',
        ]);
        $this->assertHidesRouteAndGroup($again);
        $this->assertSame(2, Request::query()->count());
        $this->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertExactJson(['data' => ['status' => 'in_progress']]);

        $this->actingAs($rafi)->postJson("/api/v1/requests/{$second->id}/accept")->assertCreated();
        $this->assertSame(2, MentorMatch::query()->count());
        $this->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => []]);
        $this->actingAs($leo)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertExactJson(['data' => ['status' => 'in_progress']]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertExactJson(['data' => ['status' => 'in_progress']]);
    }

    public function test_another_employee_accepting_leaves_no_match(): void
    {
        config(['app.debug' => false]);
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $stranger = $this->employee('Sam Lindqvist');
        $this->grant($rafi, $course);
        $request = $this->openRequest($priya, $rafi, $course);

        $response = $this->actingAs($stranger)->postJson("/api/v1/requests/{$request->id}/accept");

        $response->assertNotFound()->assertExactJson(['message' => 'Not found.']);
        $this->postJson('/api/v1/requests/999999/accept')->assertNotFound();
        $this->assertSame(0, MentorMatch::query()->count());
        $this->assertNull($request->fresh()->accepted_at);
    }

    public function test_a_grouped_or_already_accepted_request_leaves_no_new_match(): void
    {
        config(['app.debug' => false]);
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $leo = $this->employee('Leo Martins');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course, Route::GroupAssignmentAccepted);

        $group = GroupAssignment::factory()->create();
        $grouped = Request::factory()->create([
            'learner_id' => $priya->id,
            'mentor_id' => $rafi->id,
            'course_id' => $course->id,
            'group_assignment_id' => $group->id,
        ]);
        $accepted = Request::factory()->create([
            'learner_id' => $leo->id,
            'mentor_id' => $rafi->id,
            'course_id' => $course->id,
            'accepted_at' => now(),
        ]);
        MentorMatch::factory()->create(['request_id' => $accepted->id, 'started_at' => now()]);

        $this->actingAs($rafi);
        $this->postJson("/api/v1/requests/{$grouped->id}/accept")->assertNotFound()->assertExactJson(['message' => 'Not found.']);
        $this->postJson("/api/v1/requests/{$accepted->id}/accept")->assertNotFound();
        $this->assertSame(1, MentorMatch::query()->count());
        $this->assertNull($grouped->fresh()->accepted_at);
        $this->assertHidesRouteAndGroup($this->getJson('/api/v1/requests')->assertOk());
        $this->assertSame([], $this->getJson('/api/v1/requests')->json('data'));
    }

    public function test_a_guest_is_unauthorized_and_an_admin_is_forbidden(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);
        $request = $this->openRequest($priya, $rafi, $course);

        $this->getJson('/api/v1/requests')->assertUnauthorized();
        $this->postJson("/api/v1/requests/{$request->id}/accept")->assertUnauthorized();

        $this->actingAs(User::factory()->admin()->create());
        $this->getJson('/api/v1/requests')->assertForbidden();
        $this->postJson("/api/v1/requests/{$request->id}/accept")->assertForbidden();
        $this->postJson('/api/v1/requests/999999/accept')->assertForbidden();
        $this->assertSame(0, MentorMatch::query()->count());
    }

    public function test_an_accepted_request_stores_one_notice_for_the_learner(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);

        $sent = $this->actingAs($priya)->postJson("/api/v1/courses/{$course->id}/requests", [
            'mentor_id' => $rafi->id,
        ])->assertCreated();

        $this->actingAs($rafi)->postJson("/api/v1/requests/{$sent->json('data.id')}/accept")->assertCreated();

        $learner = $this->actingAs($priya)->getJson('/api/v1/notices');
        $learner->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame(
            ['id', 'type', 'occurred_at', 'person_name', 'course_title'],
            array_keys($learner->json('data.0')),
        );
        $this->assertSame('request_accepted', $learner->json('data.0.type'));
        $this->assertSame('Rafi Haddad', $learner->json('data.0.person_name'));
        $this->assertSame('Python Basics', $learner->json('data.0.course_title'));
        $this->assertHidesRouteAndGroup($learner);

        $mentor = $this->actingAs($rafi)->getJson('/api/v1/notices');
        $mentor->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('request_sent', $mentor->json('data.0.type'));
        $this->assertSame(['request_sent'], array_column($mentor->json('data'), 'type'));
        $this->assertHidesRouteAndGroup($mentor);
        $this->assertDatabaseCount('notifications', 2);
    }

    public function test_a_refused_accept_stores_no_notice_and_no_match(): void
    {
        config(['app.debug' => false]);
        $this->travelTo('2026-11-15 09:00:00');
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $leo = $this->employee('Leo Martins');
        $nora = $this->employee('Nora Berg');
        $rafi = $this->employee('Rafi Haddad');
        $stranger = $this->employee('Sam Lindqvist');
        $this->grant($rafi, $course, Route::GroupAssignmentAccepted);

        $cancelled = Request::factory()->create([
            'learner_id' => $priya->id,
            'mentor_id' => $rafi->id,
            'course_id' => $course->id,
            'sent_at' => now()->subHours(144),
            'accepted_at' => null,
            'group_assignment_id' => null,
        ]);
        $group = GroupAssignment::factory()->create();
        $grouped = Request::factory()->create([
            'learner_id' => $leo->id,
            'mentor_id' => $rafi->id,
            'course_id' => $course->id,
            'sent_at' => now(),
            'group_assignment_id' => $group->id,
        ]);
        $already = Request::factory()->create([
            'learner_id' => $nora->id,
            'mentor_id' => $rafi->id,
            'course_id' => $course->id,
            'sent_at' => now(),
            'accepted_at' => now(),
        ]);
        MentorMatch::factory()->create(['request_id' => $already->id, 'started_at' => now()]);
        $open = $this->openRequest($priya, $rafi, $course);

        $this->actingAs($rafi);
        $this->postJson("/api/v1/requests/{$cancelled->id}/accept")->assertNotFound()->assertExactJson(['message' => 'Not found.']);
        $this->postJson("/api/v1/requests/{$grouped->id}/accept")->assertNotFound();
        $this->postJson("/api/v1/requests/{$already->id}/accept")->assertNotFound();
        $this->actingAs($stranger)->postJson("/api/v1/requests/{$open->id}/accept")->assertNotFound();

        $this->assertSame(1, MentorMatch::query()->count());
        $this->assertNull($cancelled->fresh()->accepted_at);
        $this->assertNull($grouped->fresh()->accepted_at);
        $this->assertNull($open->fresh()->accepted_at);
        $this->assertDatabaseCount('notifications', 0);
        foreach ([$priya, $rafi, $leo, $nora, $stranger] as $person) {
            $inbox = $this->actingAs($person)->getJson('/api/v1/notices')->assertOk();
            $this->assertNotContains('request_accepted', array_column($inbox->json('data'), 'type'));
            $this->assertNotContains('request_sent', array_column($inbox->json('data'), 'type'));
            $this->assertHidesRouteAndGroup($inbox);
        }
    }

    public function test_a_send_and_an_accept_store_no_notice_for_admin(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $admin = User::factory()->admin()->create();
        $this->grant($rafi, $course);

        $this->actingAs($admin);
        $this->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $rafi->id])->assertForbidden();
        $this->getJson('/api/v1/notices')->assertForbidden();
        $this->assertDatabaseCount('notifications', 0);

        $sent = $this->actingAs($priya)->postJson("/api/v1/courses/{$course->id}/requests", [
            'mentor_id' => $rafi->id,
        ])->assertCreated();

        $this->actingAs($admin)->postJson("/api/v1/requests/{$sent->json('data.id')}/accept")->assertForbidden();
        $this->assertSame(0, DB::table('notifications')->where('notifiable_id', $admin->id)->count());

        $this->actingAs($rafi)->postJson("/api/v1/requests/{$sent->json('data.id')}/accept")->assertCreated();

        $this->assertDatabaseCount('notifications', 2);
        $this->assertSame(0, DB::table('notifications')->where('notifiable_id', $admin->id)->count());
        $this->actingAs($admin)->getJson('/api/v1/notices')->assertForbidden();
        $this->actingAs($priya)->getJson('/api/v1/notices')->assertJsonPath('data.0.type', 'request_accepted');
        $this->actingAs($rafi)->getJson('/api/v1/notices')->assertJsonPath('data.0.type', 'request_sent');
    }

    private function openRequest(User $learner, User $mentor, Course $course): Request
    {
        return Request::factory()->create([
            'learner_id' => $learner->id,
            'mentor_id' => $mentor->id,
            'course_id' => $course->id,
            'sent_at' => now(),
            'accepted_at' => null,
            'group_assignment_id' => null,
        ]);
    }
}
