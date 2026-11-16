<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;
use App\Modules\Notifications\Queries\Inbox;
use Illuminate\Support\Carbon;

class RequestTimeTest extends MatchingTestCase
{
    public function test_before_day_3_there_is_no_reminder_and_accept_works(): void
    {
        $sent = $this->at('2026-11-15 00:00:00');
        [$course, $priya, $rafi, $request] = $this->openRequest($sent);

        $this->travelTo($sent->copy()->addHours(71)->addMinutes(59));

        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertOk()
            ->assertExactJson(['data' => ['status' => 'not_yet_started']]);
        $list = $this->actingAs($rafi)->getJson('/api/v1/requests');
        $list->assertOk()->assertExactJson(['data' => [
            ['id' => $request->id, 'learner_name' => 'Priya Nair', 'course_title' => 'Python Basics'],
        ]]);
        $this->assertHidesRouteAndGroup($list);
        $notices = $this->actingAs($priya)->getJson('/api/v1/notices');
        $notices->assertOk()->assertExactJson(['data' => []]);
        $this->actingAs($rafi)->getJson('/api/v1/notices')->assertExactJson(['data' => []]);
        $this->assertDatabaseCount('notifications', 0);

        $this->actingAs($rafi)->postJson("/api/v1/requests/{$request->id}/accept")->assertCreated();
        $this->assertSame(1, MentorMatch::query()->count());
    }

    public function test_on_day_3_both_parties_are_reminded_and_the_request_stays(): void
    {
        $sent = $this->at('2026-11-15 00:00:00');
        [$course, $priya, $rafi, $request] = $this->openRequest($sent);

        $this->travelTo($sent->copy()->addHours(72));

        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertOk()
            ->assertExactJson(['data' => ['status' => 'not_yet_started']]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/request-eligibility")
            ->assertExactJson(['data' => ['can_request' => false]]);
        $list = $this->actingAs($rafi)->getJson('/api/v1/requests');
        $list->assertOk()->assertExactJson(['data' => [
            ['id' => $request->id, 'learner_name' => 'Priya Nair', 'course_title' => 'Python Basics'],
        ]]);
        $this->assertHidesRouteAndGroup($list);

        $occurredAt = $sent->copy()->addHours(72)->utc()->toIso8601ZuluString();
        $learner = $this->actingAs($priya)->getJson('/api/v1/notices');
        $learner->assertOk()->assertExactJson(['data' => [
            $this->notice('request_reminder_day3', $request->id, $occurredAt, 'learner', 'Rafi Haddad', 'Python Basics'),
        ]]);
        $this->assertHidesRouteAndGroup($learner);
        $mentor = $this->actingAs($rafi)->getJson('/api/v1/notices');
        $mentor->assertOk()->assertExactJson(['data' => [
            $this->notice('request_reminder_day3', $request->id, $occurredAt, 'mentor', 'Priya Nair', 'Python Basics'),
        ]]);
        $this->assertHidesRouteAndGroup($mentor);
        $this->assertDatabaseCount('notifications', 0);

        $this->travel(1)->seconds();
        app(SendNotice::class)->handle($rafi->id, NoticeType::RegistrationDecision, [
            'course_title' => 'Git Essentials',
            'outcome' => 'approved',
        ]);
        $merged = $this->actingAs($rafi)->getJson('/api/v1/notices');
        $merged->assertOk();
        $this->assertSame('registration_decision', $merged->json('data.0.type'));
        $this->assertSame('request_reminder_day3:'.$request->id, $merged->json('data.1.id'));
        $this->assertSame($occurredAt, $merged->json('data.1.occurred_at'));

        $this->actingAs($rafi)->postJson("/api/v1/requests/{$request->id}/accept")->assertCreated();
        $this->assertSame(1, MentorMatch::query()->count());
    }

    public function test_just_before_day_6_the_request_is_still_reminded_and_accept_works(): void
    {
        $sent = $this->at('2026-11-15 00:00:00');
        [$course, $priya, $rafi, $request] = $this->openRequest($sent);

        $this->travelTo($sent->copy()->addHours(143)->addMinutes(59));

        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertExactJson(['data' => ['status' => 'not_yet_started']]);
        $this->actingAs($rafi)->getJson('/api/v1/requests')
            ->assertJsonPath('data.0.id', $request->id);

        $occurredAt = $sent->copy()->addHours(72)->utc()->toIso8601ZuluString();
        $learner = $this->actingAs($priya)->getJson('/api/v1/notices');
        $learner->assertOk()->assertExactJson(['data' => [
            $this->notice('request_reminder_day3', $request->id, $occurredAt, 'learner', 'Rafi Haddad', 'Python Basics'),
        ]]);
        $this->assertHidesRouteAndGroup($learner);

        $this->actingAs($rafi)->postJson("/api/v1/requests/{$request->id}/accept")->assertCreated();
        $this->assertSame(1, MentorMatch::query()->count());
        $this->actingAs($priya)->getJson('/api/v1/notices')->assertJsonMissing(['type' => 'request_cancelled_day6']);
    }

    public function test_on_day_6_the_request_is_cancelled_for_both_parties(): void
    {
        config(['app.debug' => false]);
        $sent = $this->at('2026-11-15 00:00:00');
        [$course, $priya, $rafi, $request] = $this->openRequest($sent);

        $this->travelTo($sent->copy()->addHours(144));

        $this->actingAs($rafi)->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => []]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertOk()
            ->assertExactJson(['data' => ['status' => null]]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/request-eligibility")
            ->assertOk()
            ->assertExactJson(['data' => ['can_request' => true]]);

        $accept = $this->actingAs($rafi)->postJson("/api/v1/requests/{$request->id}/accept");
        $accept->assertNotFound()->assertExactJson(['message' => 'Not found.']);
        $this->assertSame(0, MentorMatch::query()->count());
        $this->assertNull($request->fresh()->accepted_at);
        $this->assertDatabaseCount('notifications', 0);

        $day3 = $sent->copy()->addHours(72)->utc()->toIso8601ZuluString();
        $day6 = $sent->copy()->addHours(144)->utc()->toIso8601ZuluString();
        $learner = $this->actingAs($priya)->getJson('/api/v1/notices');
        $learner->assertOk()->assertExactJson(['data' => [
            $this->notice('request_cancelled_day6', $request->id, $day6, 'learner', 'Rafi Haddad', 'Python Basics'),
            $this->notice('request_reminder_day3', $request->id, $day3, 'learner', 'Rafi Haddad', 'Python Basics'),
        ]]);
        $this->assertHidesRouteAndGroup($learner);
        $mentor = $this->actingAs($rafi)->getJson('/api/v1/notices');
        $mentor->assertOk()->assertExactJson(['data' => [
            $this->notice('request_cancelled_day6', $request->id, $day6, 'mentor', 'Priya Nair', 'Python Basics'),
            $this->notice('request_reminder_day3', $request->id, $day3, 'mentor', 'Priya Nair', 'Python Basics'),
        ]]);
        $this->assertHidesRouteAndGroup($mentor);

        $again = $this->actingAs($priya)->postJson("/api/v1/courses/{$course->id}/requests", [
            'mentor_id' => $rafi->id,
        ]);
        $again->assertCreated();
        $this->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertExactJson(['data' => ['status' => 'not_yet_started']]);
        $this->actingAs($rafi)->getJson('/api/v1/requests')
            ->assertJsonPath('data.0.id', $again->json('data.id'));
        $this->assertSame(0, MentorMatch::query()->count());
    }

    public function test_a_request_accepted_before_the_reminder_never_gets_a_time_notice(): void
    {
        $sent = $this->at('2026-11-15 00:00:00');
        [$course, $priya, $rafi, $request] = $this->openRequest($sent);

        $this->travelTo($sent->copy()->addHour());
        $this->actingAs($rafi)->postJson("/api/v1/requests/{$request->id}/accept")->assertCreated();

        foreach ([$sent->copy()->addHours(144), $sent->copy()->addDays(60)] as $later) {
            $this->travelTo($later);
            $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")
                ->assertExactJson(['data' => ['status' => 'in_progress']]);
            $this->actingAs($priya)->getJson('/api/v1/notices')->assertExactJson(['data' => []]);
            $this->actingAs($rafi)->getJson('/api/v1/notices')->assertExactJson(['data' => []]);
        }

        $this->assertSame(1, MentorMatch::query()->count());
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_a_request_accepted_after_the_reminder_keeps_the_day_3_notice(): void
    {
        $sent = $this->at('2026-11-15 00:00:00');
        [$course, $priya, $rafi, $request] = $this->openRequest($sent);

        $this->travelTo($sent->copy()->addHours(80));
        $this->actingAs($rafi)->postJson("/api/v1/requests/{$request->id}/accept")->assertCreated();

        $this->travelTo($sent->copy()->addHours(144));

        $occurredAt = $sent->copy()->addHours(72)->utc()->toIso8601ZuluString();
        $learner = $this->actingAs($priya)->getJson('/api/v1/notices');
        $learner->assertOk()->assertExactJson(['data' => [
            $this->notice('request_reminder_day3', $request->id, $occurredAt, 'learner', 'Rafi Haddad', 'Python Basics'),
        ]]);
        $this->assertHidesRouteAndGroup($learner);
        $this->actingAs($rafi)->getJson('/api/v1/notices')->assertExactJson(['data' => [
            $this->notice('request_reminder_day3', $request->id, $occurredAt, 'mentor', 'Priya Nair', 'Python Basics'),
        ]]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertExactJson(['data' => ['status' => 'in_progress']]);
        $this->assertSame(1, MentorMatch::query()->count());
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_a_guest_is_unauthorized_and_admin_gets_no_notice(): void
    {
        $sent = $this->at('2026-11-15 00:00:00');
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $admin = User::factory()->admin()->create(['name' => 'Ada Admin']);
        Request::factory()->create([
            'learner_id' => $priya->id,
            'mentor_id' => $admin->id,
            'course_id' => $course->id,
            'sent_at' => $sent,
            'accepted_at' => null,
            'group_assignment_id' => null,
        ]);

        $this->travelTo($sent->copy()->addHours(72));

        $this->getJson('/api/v1/notices')->assertUnauthorized();
        $this->actingAs($admin)->getJson('/api/v1/notices')->assertForbidden();
        $this->assertSame([], app(Inbox::class)->handle($admin->id));
        $this->assertDatabaseCount('notifications', 0);

        $learner = $this->actingAs($priya)->getJson('/api/v1/notices');
        $learner->assertOk();
        $this->assertSame('Ada Admin', $learner->json('data.0.person_name'));
        $this->assertHidesRouteAndGroup($learner);
    }

    public function test_the_clock_route_is_not_registered_when_the_app_is_not_e2e(): void
    {
        $this->assertContains(app()->environment(), ['local', 'testing', 'production']);
        $this->postJson('/api/v1/testing/clock', ['now' => '2026-11-18T00:00:00Z'])->assertNotFound();
        $this->deleteJson('/api/v1/testing/requests/1')->assertNotFound();

        $uris = [];
        foreach (app('router')->getRoutes() as $route) {
            $uris[] = $route->uri();
        }
        $this->assertNotContains('api/v1/testing/clock', $uris);
        $this->assertNotContains('api/v1/testing/requests/{id}', $uris);
    }

    private function at(string $instant): Carbon
    {
        $this->travelTo(Carbon::parse($instant, 'UTC'));

        return Carbon::parse($instant, 'UTC');
    }

    /**
     * @return array{0: Course, 1: User, 2: User, 3: Request}
     */
    private function openRequest(Carbon $sent): array
    {
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);
        $request = Request::factory()->create([
            'learner_id' => $priya->id,
            'mentor_id' => $rafi->id,
            'course_id' => $course->id,
            'sent_at' => $sent,
            'accepted_at' => null,
            'group_assignment_id' => null,
        ]);

        return [$course, $priya, $rafi, $request];
    }

    /**
     * @return array{id: string, type: string, occurred_at: string, party: string, person_name: string, course_title: string}
     */
    private function notice(string $type, int $requestId, string $occurredAt, string $party, string $person, string $course): array
    {
        return [
            'id' => $type.':'.$requestId,
            'type' => $type,
            'occurred_at' => $occurredAt,
            'party' => $party,
            'person_name' => $person,
            'course_title' => $course,
        ];
    }
}
