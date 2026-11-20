<?php

namespace Tests\Feature\Matching;

use App\Modules\Matching\Models\MatchEndReason;
use Illuminate\Support\Facades\DB;

class QuitMatchTest extends MatchingTestCase
{
    public function test_the_mentor_quits_and_the_learner_is_told_why(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        [$priya, $rafi, $course, $match] = $this->liveMatch();

        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => '  Moving teams, sorry '])->assertNoContent();

        $match->refresh();
        $this->assertNotNull($match->ended_at);
        $this->assertSame(MatchEndReason::Quit, $match->end_reason);
        $this->assertSame($rafi->id, $match->quit_by_id);
        $this->assertSame('Moving teams, sorry', $match->quit_reason);

        $notices = $this->actingAs($priya)->getJson('/api/v1/notices')->assertOk()->json('data');
        $quit = collect($notices)->firstWhere('type', 'match_quit');
        $this->assertSame(
            ['person_name' => 'Rafi Haddad', 'course_title' => 'Python Basics', 'reason' => 'Moving teams, sorry'],
            collect($quit)->only(['person_name', 'course_title', 'reason'])->all(),
        );

        // The quitter gets no note, and the Match is gone everywhere.
        $this->assertNull(collect($this->actingAs($rafi)->getJson('/api/v1/notices')->json('data'))->firstWhere('type', 'match_quit'));
        $this->actingAs($rafi)->getJson('/api/v1/home')->assertExactJson(['data' => ['learning' => [], 'mentoring' => []]]);
        $this->actingAs($priya)->getJson('/api/v1/home')->assertExactJson(['data' => ['learning' => [[
            'course_id' => $course->id,
            'course_title' => 'Python Basics',
            'status' => 'quit',
            'match_id' => null,
        ]], 'mentoring' => []]]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")->assertExactJson(['data' => ['status' => 'quit']]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/request-eligibility")->assertExactJson(['data' => ['can_request' => true]]);
        $this->actingAs($priya)->getJson("/api/v1/matches/{$match->id}")->assertNotFound();
        $this->actingAs($rafi)->getJson("/api/v1/matches/{$match->id}")->assertNotFound();
    }

    public function test_the_learner_quits_and_the_mentor_is_told_why_with_the_same_bar(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        [$priya, $rafi, $course, $match] = $this->liveMatch();

        $this->actingAs($priya)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => 'Too busy'])->assertNoContent();

        $notices = $this->actingAs($rafi)->getJson('/api/v1/notices')->json('data');
        $quit = collect($notices)->firstWhere('type', 'match_quit');
        $this->assertSame('Priya Nair', $quit['person_name']);
        $this->assertSame('Too busy', $quit['reason']);
        $this->assertNull(collect($this->actingAs($priya)->getJson('/api/v1/notices')->json('data'))->firstWhere('type', 'match_quit'));
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")->assertExactJson(['data' => ['status' => 'quit']]);
    }

    public function test_a_blank_or_overlong_reason_is_refused_and_nothing_changes(): void
    {
        [, $rafi, , $match] = $this->liveMatch();

        foreach (['', '   ', str_repeat('a', 501)] as $reason) {
            $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => $reason])
                ->assertUnprocessable()->assertJsonValidationErrors('reason');
        }
        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/quit", [])->assertUnprocessable();

        $this->assertNull($match->refresh()->ended_at);
        $this->assertSame(0, DB::table('notifications')->where('type', 'match_quit')->count());

        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => str_repeat('a', 500)])->assertNoContent();
    }

    public function test_a_stranger_an_ended_match_or_a_missing_match_is_not_found(): void
    {
        config(['app.debug' => false]);
        [$priya, $rafi, , $match] = $this->liveMatch();
        $sam = $this->employee('Sam Lindqvist');

        $this->actingAs($sam)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => 'x'])->assertNotFound();
        $this->assertNull($match->refresh()->ended_at);

        $this->actingAs($priya)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => 'first'])->assertNoContent();
        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => 'second'])->assertNotFound();
        $this->assertSame('first', $match->refresh()->quit_reason);
        $this->assertSame(1, DB::table('notifications')->where('type', 'match_quit')->count());

        $this->actingAs($rafi)->postJson('/api/v1/matches/999999/quit', ['reason' => 'x'])->assertNotFound();
    }

    public function test_a_new_request_after_quit_is_not_yet_started_and_its_cancel_leaves_no_status(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        [$priya, $rafi, $course, $match] = $this->liveMatch();
        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => 'Moving teams'])->assertNoContent();

        $this->actingAs($priya)->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $rafi->id])->assertCreated();
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")->assertExactJson(['data' => ['status' => 'not_yet_started']]);

        $this->travelTo('2026-11-21 09:00:01');
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")->assertExactJson(['data' => ['status' => null]]);
        $this->actingAs($priya)->getJson('/api/v1/home')->assertExactJson(['data' => ['learning' => [], 'mentoring' => []]]);
    }

    public function test_the_reason_is_shown_nowhere_but_the_other_partys_notice(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        [$priya, $rafi, $course, $match] = $this->liveMatch();
        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => 'Secret reason'])->assertNoContent();

        foreach ([$priya, $rafi] as $user) {
            foreach (['/api/v1/home', "/api/v1/courses/{$course->id}", "/api/v1/courses/{$course->id}/progress", "/api/v1/courses/{$course->id}/mentors", '/api/v1/requests'] as $url) {
                $this->assertStringNotContainsString('Secret reason', $this->actingAs($user)->getJson($url)->getContent());
            }
        }
        $this->assertStringNotContainsString('Secret reason', $this->actingAs($rafi)->getJson('/api/v1/notices')->getContent());
    }
}
