<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\MatchEndReason;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use Illuminate\Support\Facades\DB;

class CompleteCourseTest extends MatchingTestCase
{
    public function test_the_mentor_completes_and_the_learner_is_told_bronze_is_open(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        [$priya, $rafi, $course, $match] = $this->liveMatch();

        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/course-completed")->assertNoContent();

        $match->refresh();
        $this->assertNotNull($match->ended_at);
        $this->assertSame(MatchEndReason::CourseCompleted, $match->end_reason);
        $this->assertNull($match->quit_by_id);
        $this->assertNull($match->quit_reason);

        $notice = collect($this->actingAs($priya)->getJson('/api/v1/notices')->assertOk()->json('data'))->firstWhere('type', 'bronze_available');
        $this->assertSame('Python Basics', $notice['course_title']);
        $this->assertSame(['id', 'type', 'occurred_at', 'course_title'], array_keys($notice));

        // No notice to the Mentor, and the Match is gone for both.
        $this->assertNull(collect($this->actingAs($rafi)->getJson('/api/v1/notices')->json('data'))->firstWhere('type', 'bronze_available'));
        $this->actingAs($rafi)->getJson('/api/v1/home')->assertExactJson(['data' => ['learning' => [], 'mentoring' => []]]);
        $this->actingAs($priya)->getJson("/api/v1/matches/{$match->id}")->assertNotFound();
        $this->actingAs($rafi)->getJson("/api/v1/matches/{$match->id}")->assertNotFound();

        // The Learner's bar stays In progress and no Request is allowed on this Course.
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")->assertExactJson(['data' => ['status' => 'in_progress']]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/request-eligibility")->assertExactJson(['data' => ['can_request' => false]]);
        $this->actingAs($priya)->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $rafi->id])
            ->assertConflict()->assertJsonPath('code', 'MATCHING_COURSE_ALREADY_COMPLETED');
    }

    public function test_the_match_screen_flags_the_mentor_only(): void
    {
        [$priya, $rafi, , $match] = $this->liveMatch();

        $this->assertTrue($this->actingAs($rafi)->getJson("/api/v1/matches/{$match->id}")->json('data.can_complete_course'));
        $this->assertFalse($this->actingAs($priya)->getJson("/api/v1/matches/{$match->id}")->json('data.can_complete_course'));
    }

    public function test_the_learner_a_stranger_an_ended_or_missing_match_is_not_found_and_nothing_changes(): void
    {
        config(['app.debug' => false]);
        [$priya, $rafi, , $match] = $this->liveMatch();
        $sam = $this->employee('Sam Lindqvist');

        $this->actingAs($priya)->postJson("/api/v1/matches/{$match->id}/course-completed")->assertNotFound();
        $this->actingAs($sam)->postJson("/api/v1/matches/{$match->id}/course-completed")->assertNotFound();
        $this->assertNull($match->refresh()->ended_at);
        $this->assertSame(0, DB::table('notifications')->where('type', 'bronze_available')->count());

        $this->actingAs($rafi)->postJson('/api/v1/matches/999999/course-completed')->assertNotFound();

        // A double call: exactly one notice.
        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/course-completed")->assertNoContent();
        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/course-completed")->assertNotFound();
        $this->assertSame(1, DB::table('notifications')->where('type', 'bronze_available')->count());
    }

    public function test_an_admin_is_forbidden(): void
    {
        [, , , $match] = $this->liveMatch();

        $this->actingAs(User::factory()->admin()->create())->postJson("/api/v1/matches/{$match->id}/course-completed")->assertForbidden();
        $this->assertNull($match->refresh()->ended_at);
    }

    public function test_a_signed_out_caller_is_unauthorized(): void
    {
        [, , , $match] = $this->liveMatch();

        $this->app['auth']->forgetGuards();
        $this->postJson("/api/v1/matches/{$match->id}/course-completed")->assertUnauthorized();
        $this->assertNull($match->refresh()->ended_at);
    }

    /**
     * @return array{0: User, 1: User, 2: Course, 3: MentorMatch}
     */
    private function liveMatch(): array
    {
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);
        $request = Request::factory()->create([
            'learner_id' => $priya->id,
            'mentor_id' => $rafi->id,
            'course_id' => $course->id,
            'sent_at' => now(),
            'accepted_at' => null,
            'group_assignment_id' => null,
        ]);
        $this->actingAs($rafi)->postJson("/api/v1/requests/{$request->id}/accept")->assertCreated();

        return [$priya, $rafi, $course, MentorMatch::query()->where('request_id', $request->id)->firstOrFail()];
    }
}
