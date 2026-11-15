<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Models\Route;

class SendRequestTest extends MatchingTestCase
{
    public function test_a_learner_request_to_a_listed_mentor_is_stored_and_not_yet_started(): void
    {
        $this->travelTo('2026-11-15 08:30:00');
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course, Route::GoldPass);
        $this->actingAs($priya);

        $this->getJson("/api/v1/courses/{$course->id}/progress")->assertOk()->assertExactJson(['data' => ['status' => null]]);
        $this->getJson("/api/v1/courses/{$course->id}/request-eligibility")->assertOk()->assertExactJson(['data' => ['can_request' => true]]);

        $response = $this->postJson("/api/v1/courses/{$course->id}/requests", [
            'mentor_id' => $rafi->id,
        ]);

        $response->assertCreated()->assertExactJson(['data' => [
            'id' => $response->json('data.id'),
            'course_id' => $course->id,
            'mentor_id' => $rafi->id,
            'sent_at' => now()->utc()->toJSON(),
        ]]);
        $this->assertHidesRouteAndGroup($response);
        $this->assertDatabaseHas('requests', [
            'learner_id' => $priya->id,
            'mentor_id' => $rafi->id,
            'course_id' => $course->id,
            'group_assignment_id' => null,
            'accepted_at' => null,
        ]);

        $eligibility = $this->getJson("/api/v1/courses/{$course->id}/request-eligibility");
        $eligibility->assertOk()->assertExactJson(['data' => ['can_request' => false]]);
        $this->assertHidesRouteAndGroup($eligibility);

        $progress = $this->getJson("/api/v1/courses/{$course->id}/progress");
        $progress->assertOk()->assertExactJson(['data' => ['status' => 'not_yet_started']]);
        $this->assertHidesRouteAndGroup($progress);
    }

    public function test_a_second_open_request_for_the_same_course_is_refused(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $imani = $this->employee('Imani Okafor');
        $this->grant($rafi, $course);
        $this->grant($imani, $course);
        $this->actingAs($priya)->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $rafi->id])->assertCreated();

        $again = $this->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $imani->id]);

        $again->assertConflict()->assertExactJson([
            'message' => 'You already have an open request for this course.',
            'code' => 'MATCHING_REQUEST_ALREADY_OPEN',
        ]);
        $this->assertSame(1, Request::query()->count());
        $this->getJson("/api/v1/courses/{$course->id}/request-eligibility")
            ->assertOk()
            ->assertExactJson(['data' => ['can_request' => false]]);
    }

    public function test_a_person_who_is_not_a_mentor_of_the_published_course_is_rejected(): void
    {
        $course = $this->publishedCourse();
        $other = $this->publishedCourse('Git Essentials');
        $priya = $this->employee('Priya Nair');
        $stranger = $this->employee('Sam Lindqvist');
        $mentorElsewhere = $this->employee('Imani Okafor');
        $this->grant($mentorElsewhere, $other);
        $this->actingAs($priya);

        $this->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $stranger->id])->assertUnprocessable();
        $this->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $mentorElsewhere->id])->assertUnprocessable();
        $this->assertSame(0, Request::query()->count());
    }

    public function test_a_draft_or_missing_course_stores_nothing(): void
    {
        config(['app.debug' => false]);
        $draft = Course::factory()->create();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $draft);
        $this->actingAs($priya);

        $this->postJson("/api/v1/courses/{$draft->id}/requests", ['mentor_id' => $rafi->id])->assertNotFound();
        $missing = $this->postJson('/api/v1/courses/999999/requests', ['mentor_id' => $rafi->id])->assertNotFound();
        $this->assertSame(['message' => 'Not found.'], $missing->json());
        $this->assertSame(0, Request::query()->count());
    }

    public function test_a_guest_is_unauthorized_and_an_admin_is_forbidden(): void
    {
        $course = $this->publishedCourse();
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);

        $this->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $rafi->id])->assertUnauthorized();
        $this->getJson("/api/v1/courses/{$course->id}/request-eligibility")->assertUnauthorized();
        $this->getJson("/api/v1/courses/{$course->id}/progress")->assertUnauthorized();

        $this->actingAs(User::factory()->admin()->create());
        $this->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $rafi->id])->assertForbidden();
        $this->getJson("/api/v1/courses/{$course->id}/request-eligibility")->assertForbidden();
        $this->getJson("/api/v1/courses/{$course->id}/progress")->assertForbidden();
        // The role check runs before the lookup, so Admin can't tell a missing Course from a real one.
        $this->getJson('/api/v1/courses/999999/progress')->assertForbidden();
        $this->assertSame(0, Request::query()->count());
    }
}
