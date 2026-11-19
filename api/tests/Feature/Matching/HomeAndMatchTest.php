<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\GroupAssignment;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Models\Route;

class HomeAndMatchTest extends MatchingTestCase
{
    public function test_a_pending_request_is_on_learning_and_the_mentor_has_no_mentoring_card(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);
        $group = GroupAssignment::factory()->create();
        Request::factory()->create([
            'learner_id' => $priya->id,
            'mentor_id' => $rafi->id,
            'course_id' => $course->id,
            'group_assignment_id' => $group->id,
            'sent_at' => now(),
            'accepted_at' => null,
        ]);

        $learning = $this->actingAs($priya)->getJson('/api/v1/home');
        $learning->assertOk()->assertExactJson(['data' => [
            'learning' => [[
                'course_id' => $course->id,
                'course_title' => 'Python Basics',
                'status' => 'not_yet_started',
                'match_id' => null,
            ]],
            'mentoring' => [],
        ]]);
        $this->assertHidesRouteAndGroup($learning);

        $mentoring = $this->actingAs($rafi)->getJson('/api/v1/home');
        $mentoring->assertOk()->assertExactJson(['data' => ['learning' => [], 'mentoring' => []]]);
        $this->assertHidesRouteAndGroup($mentoring);
    }

    public function test_an_accepted_request_is_the_match_on_both_homes(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        $python = $this->publishedCourse('Python Basics');
        $algebra = $this->publishedCourse('Algebra');
        $priya = $this->employee('Priya Nair');
        $leo = $this->employee('Leo Martins');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $python);
        $this->grant($rafi, $algebra, Route::GoldPass);
        $priyaPython = $this->openRequest($priya, $rafi, $python);
        $leoPython = $this->openRequest($leo, $rafi, $python);
        $group = GroupAssignment::factory()->create();
        Request::factory()->create([
            'learner_id' => $priya->id,
            'mentor_id' => $rafi->id,
            'course_id' => $algebra->id,
            'group_assignment_id' => $group->id,
            'sent_at' => now(),
            'accepted_at' => null,
        ]);

        $this->actingAs($rafi);
        $this->postJson("/api/v1/requests/{$priyaPython->id}/accept")->assertCreated();
        $this->postJson("/api/v1/requests/{$leoPython->id}/accept")->assertCreated();
        $priyaMatchId = (int) MentorMatch::query()->where('request_id', $priyaPython->id)->value('id');
        $leoMatchId = (int) MentorMatch::query()->where('request_id', $leoPython->id)->value('id');

        $learning = $this->actingAs($priya)->getJson('/api/v1/home');
        $learning->assertOk()->assertExactJson(['data' => [
            'learning' => [
                [
                    'course_id' => $algebra->id,
                    'course_title' => 'Algebra',
                    'status' => 'not_yet_started',
                    'match_id' => null,
                ],
                [
                    'course_id' => $python->id,
                    'course_title' => 'Python Basics',
                    'status' => 'in_progress',
                    'match_id' => $priyaMatchId,
                ],
            ],
            'mentoring' => [],
        ]]);
        $this->assertHidesRouteAndGroup($learning);

        $mentoring = $this->actingAs($rafi)->getJson('/api/v1/home');
        $mentoring->assertOk()->assertExactJson(['data' => [
            'learning' => [],
            'mentoring' => [
                ['id' => $leoMatchId, 'person_name' => 'Leo Martins', 'course_title' => 'Python Basics'],
                ['id' => $priyaMatchId, 'person_name' => 'Priya Nair', 'course_title' => 'Python Basics'],
            ],
        ]]);
        $this->assertHidesRouteAndGroup($mentoring);
    }

    public function test_either_party_reads_the_match(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        [$priya, $rafi, , $match] = $this->acceptedMatch();

        $learner = $this->actingAs($priya)->getJson("/api/v1/matches/{$match->id}");
        $learner->assertOk()->assertExactJson(['data' => [
            'person_name' => 'Rafi Haddad',
            'course_title' => 'Python Basics',
            'status' => 'in_progress',
            'can_complete_course' => false,
        ]]);
        $this->assertHidesRouteAndGroup($learner);

        $mentor = $this->actingAs($rafi)->getJson("/api/v1/matches/{$match->id}");
        $mentor->assertOk()->assertExactJson(['data' => [
            'person_name' => 'Priya Nair',
            'course_title' => 'Python Basics',
            'status' => 'in_progress',
            'can_complete_course' => true,
        ]]);
        $this->assertHidesRouteAndGroup($mentor);
    }

    public function test_a_stranger_or_a_missing_match_is_not_found(): void
    {
        config(['app.debug' => false]);
        [, , , $match] = $this->acceptedMatch();
        $stranger = $this->employee('Sam Lindqvist');

        $this->actingAs($stranger)->getJson("/api/v1/matches/{$match->id}")
            ->assertNotFound()
            ->assertExactJson(['message' => 'Not found.']);
        $this->getJson('/api/v1/matches/999999')->assertNotFound()->assertExactJson(['message' => 'Not found.']);
        $this->assertSame(1, MentorMatch::query()->count());
    }

    public function test_a_cancelled_request_leaves_learning_empty_and_no_match(): void
    {
        $this->travelTo('2026-11-15 09:00:00');
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);
        $this->openRequest($priya, $rafi, $course);
        $this->travelTo(now()->addHours(144));

        $home = $this->actingAs($priya)->getJson('/api/v1/home');
        $home->assertOk()->assertExactJson(['data' => ['learning' => [], 'mentoring' => []]]);
        $this->assertHidesRouteAndGroup($home);
        $this->actingAs($rafi)->getJson('/api/v1/home')
            ->assertOk()
            ->assertExactJson(['data' => ['learning' => [], 'mentoring' => []]]);
        $this->assertSame(0, MentorMatch::query()->count());
    }

    public function test_a_guest_is_unauthorized_and_an_admin_has_no_match_screen(): void
    {
        [, , , $match] = $this->acceptedMatch();

        $this->getJson('/api/v1/home')->assertUnauthorized();
        $this->getJson("/api/v1/matches/{$match->id}")->assertUnauthorized();

        $this->actingAs(User::factory()->admin()->create());
        $this->getJson('/api/v1/home')->assertForbidden();
        $this->getJson("/api/v1/matches/{$match->id}")->assertForbidden();
        $this->getJson('/api/v1/matches/999999')->assertForbidden();
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

    /**
     * @return array{0: User, 1: User, 2: Course, 3: MentorMatch}
     */
    private function acceptedMatch(): array
    {
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course, Route::GroupAssignmentAccepted);
        $request = $this->openRequest($priya, $rafi, $course);
        $request->accepted_at = now();
        $request->save();
        $match = MentorMatch::factory()->create(['request_id' => $request->id, 'started_at' => now()]);

        return [$priya, $rafi, $course, $match];
    }
}
