<?php

namespace Tests\Feature\Assessments;

use App\Modules\Accounts\Models\User;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\StageLevel;

class StageAvailabilityTest extends AssessmentsTestCase
{
    public function test_before_course_completed_no_stage_is_listed(): void
    {
        $course = $this->publishedCourse();
        $none = $this->employee('No Match');
        $live = $this->employee('Live Match');
        $quit = $this->employee('Quit Match');
        $this->match($live, $course, 'live');
        $this->match($quit, $course, 'quit');

        foreach ([$none, $live, $quit] as $learner) {
            $this->actingAs($learner)->getJson("/api/v1/courses/{$course->id}/stages")->assertExactJson(['data' => []]);
        }
    }

    public function test_after_course_completed_bronze_is_available_and_nothing_else(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);

        $response = $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages");

        $response->assertExactJson(['data' => [['level' => 'bronze', 'state' => 'available']]]);
        $this->assertHidesAnswersAndScores($response);
    }

    public function test_course_completed_on_another_course_does_not_open_this_one(): void
    {
        $course = $this->publishedCourse();
        $other = $this->publishedCourse(title: 'SQL Fundamentals');
        $priya = $this->employee();
        $this->match($priya, $other);

        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages")->assertExactJson(['data' => []]);
    }

    public function test_after_a_bronze_pass_bronze_is_passed_and_silver_available_and_a_fail_leaves_bronze_available(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);

        StageAttempt::factory()->failed()->create(['learner_id' => $priya->id, 'course_id' => $course->id]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages")
            ->assertExactJson(['data' => [['level' => 'bronze', 'state' => 'available']]]);

        StageAttempt::factory()->create(['learner_id' => $priya->id, 'course_id' => $course->id]);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages")
            ->assertExactJson(['data' => [['level' => 'bronze', 'state' => 'passed'], ['level' => 'silver', 'state' => 'available']]]);
    }

    public function test_a_pass_on_another_stage_or_by_another_learner_does_not_count(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);
        StageAttempt::factory()->create(['learner_id' => $this->employee('Sam')->id, 'course_id' => $course->id]);
        StageAttempt::factory()->create([
            'learner_id' => $priya->id,
            'course_id' => $course->id,
            'stage_id' => $this->stage($course, StageLevel::Silver)->id,
        ]);

        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages")
            ->assertExactJson(['data' => [['level' => 'bronze', 'state' => 'available']]]);
    }

    public function test_a_draft_or_missing_course_is_not_found(): void
    {
        $priya = $this->employee();
        $draft = Course::factory()->create();

        $this->actingAs($priya)->getJson("/api/v1/courses/{$draft->id}/stages")->assertNotFound();
        $this->actingAs($priya)->getJson('/api/v1/courses/999999/stages')->assertNotFound();
    }

    public function test_an_admin_is_forbidden_and_a_signed_out_caller_is_unauthorized(): void
    {
        $course = $this->publishedCourse();

        $this->actingAs(User::factory()->admin()->create())->getJson("/api/v1/courses/{$course->id}/stages")->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/v1/courses/{$course->id}/stages")->assertUnauthorized();
    }
}
