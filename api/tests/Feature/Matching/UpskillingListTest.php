<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;

class UpskillingListTest extends MatchingTestCase
{
    public function test_employee_and_admin_see_the_same_in_progress_rows_sorted_by_name_then_title(): void
    {
        $python = $this->publishedCourse('Python Basics');
        $sql = $this->publishedCourse('sql Fundamentals');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $python);
        $this->grant($rafi, $sql);

        $priya = $this->employee('priya Nair');
        $imani = $this->employee('Imani Okafor');
        $sam = $this->employee('Sam Lindqvist');
        $this->acceptedMatch($priya, $rafi, $sql);
        $this->acceptedMatch($priya, $rafi, $python);
        $this->acceptedMatch($imani, $rafi, $python);
        // Not yet started: a pending Request. Quit: a quit Match. Neither is listed.
        $this->openRequest($sam, $rafi, $python);
        $quitter = $this->employee('Quinn Quitter');
        $match = $this->acceptedMatch($quitter, $rafi, $python);
        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/quit", ['reason' => 'Busy'])->assertNoContent();

        $expected = ['data' => [
            ['person_name' => 'Imani Okafor', 'course_title' => 'Python Basics', 'status' => 'in_progress'],
            ['person_name' => 'priya Nair', 'course_title' => 'Python Basics', 'status' => 'in_progress'],
            ['person_name' => 'priya Nair', 'course_title' => 'sql Fundamentals', 'status' => 'in_progress'],
        ]];

        $this->actingAs($sam)->getJson('/api/v1/upskilling')->assertOk()->assertExactJson($expected);
        $admin = User::factory()->admin()->create();
        $response = $this->actingAs($admin)->getJson('/api/v1/upskilling')->assertOk()->assertExactJson($expected);
        $this->assertHidesRouteAndGroup($response);
        $this->assertStringNotContainsString('match', $response->getContent());
        $this->assertStringNotContainsString('mentor', strtolower($response->getContent()));
    }

    public function test_a_learner_whose_mentor_clicked_course_completed_stays_listed(): void
    {
        $course = $this->publishedCourse();
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);
        $priya = $this->employee('Priya Nair');
        $match = $this->acceptedMatch($priya, $rafi, $course);
        $this->actingAs($rafi)->postJson("/api/v1/matches/{$match->id}/course-completed")->assertNoContent();

        $this->actingAs($priya)->getJson('/api/v1/upskilling')->assertExactJson(['data' => [
            ['person_name' => 'Priya Nair', 'course_title' => 'Python Basics', 'status' => 'in_progress'],
        ]]);
    }

    public function test_pending_and_cancelled_requests_are_not_listed_and_an_empty_list_is_empty(): void
    {
        $course = $this->publishedCourse();
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);
        $priya = $this->employee('Priya Nair');
        $this->openRequest($priya, $rafi, $course);
        $this->actingAs($priya)->getJson('/api/v1/upskilling')->assertExactJson(['data' => []]);

        $this->travelTo(now()->addDays(7));
        $this->actingAs($priya)->getJson('/api/v1/upskilling')->assertExactJson(['data' => []]);
    }

    public function test_a_signed_out_caller_is_unauthorized(): void
    {
        $this->getJson('/api/v1/upskilling')->assertUnauthorized();
    }

    private function acceptedMatch(User $learner, User $mentor, Course $course): MentorMatch
    {
        $request = $this->openRequest($learner, $mentor, $course);
        $this->actingAs($mentor)->postJson("/api/v1/requests/{$request->id}/accept")->assertCreated();

        return MentorMatch::query()->where('request_id', $request->id)->firstOrFail();
    }
}
