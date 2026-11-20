<?php

namespace Tests\Feature\Assessments;

use App\Modules\Accounts\Models\User;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\Option;
use App\Modules\Courses\Models\Question;
use App\Modules\Courses\Models\StageLevel;

class ShowAssessmentTest extends AssessmentsTestCase
{
    public function test_the_available_stage_is_read_in_authored_order_without_the_correct_option(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);

        // A second question authored first in position, but inserted later, with options out of id order.
        $bronze = $this->stage($course, StageLevel::Bronze);
        $first = Question::query()->where('stage_id', $bronze->id)->firstOrFail();
        $first->update(['position' => 2]);
        $earlier = Question::factory()->create(['stage_id' => $bronze->id, 'position' => 1, 'text' => 'Earlier?']);
        $b = Option::factory()->create(['question_id' => $earlier->id, 'position' => 2, 'text' => 'B', 'is_correct' => true]);
        $a = Option::factory()->create(['question_id' => $earlier->id, 'position' => 1, 'text' => 'A']);
        $firstOptions = Option::query()->where('question_id', $first->id)->orderBy('position')->get();

        $response = $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages/bronze/assessment");

        $response->assertOk()->assertExactJson(['data' => [
            'course' => ['id' => $course->id, 'title' => 'Python Basics'],
            'level' => 'bronze',
            'questions' => [
                ['id' => $earlier->id, 'text' => 'Earlier?', 'options' => [['id' => $a->id, 'text' => 'A'], ['id' => $b->id, 'text' => 'B']]],
                ['id' => $first->id, 'text' => $first->text, 'options' => [
                    ['id' => $firstOptions[0]->id, 'text' => 'Yes'],
                    ['id' => $firstOptions[1]->id, 'text' => 'No'],
                ]],
            ],
        ]]);
        $this->assertHidesAnswersAndScores($response);
    }

    public function test_before_course_completed_the_read_is_refused(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course, 'live');

        $response = $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages/bronze/assessment");

        $response->assertConflict()->assertExactJson(['message' => "This stage isn't open to you.", 'code' => 'ASSESSMENTS_STAGE_UNAVAILABLE']);
    }

    public function test_after_a_bronze_pass_the_read_is_refused(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);
        StageAttempt::factory()->create(['learner_id' => $priya->id, 'course_id' => $course->id]);

        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages/bronze/assessment")
            ->assertConflict()->assertExactJson(['message' => 'You have already passed this stage.', 'code' => 'ASSESSMENTS_STAGE_ALREADY_PASSED']);
    }

    public function test_silver_and_gold_are_unavailable_even_after_a_bronze_pass(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);
        StageAttempt::factory()->create(['learner_id' => $priya->id, 'course_id' => $course->id]);

        foreach (['silver', 'gold'] as $level) {
            $response = $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages/{$level}/assessment");
            $response->assertConflict()->assertJsonPath('code', 'ASSESSMENTS_STAGE_UNAVAILABLE');
            $this->assertStringNotContainsString('Question', (string) $response->getContent());
        }
    }

    public function test_a_draft_or_missing_course_and_an_unknown_stage_are_not_found(): void
    {
        $priya = $this->employee();
        $draft = Course::factory()->create();

        $this->actingAs($priya)->getJson("/api/v1/courses/{$draft->id}/stages/bronze/assessment")->assertNotFound();
        $this->actingAs($priya)->getJson('/api/v1/courses/999999/stages/bronze/assessment')->assertNotFound();
        $course = $this->publishedCourse();
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages/platinum/assessment")->assertNotFound();
    }

    public function test_an_admin_is_forbidden_and_a_signed_out_caller_is_unauthorized(): void
    {
        $course = $this->publishedCourse();

        $this->actingAs(User::factory()->admin()->create())->getJson("/api/v1/courses/{$course->id}/stages/bronze/assessment")->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/v1/courses/{$course->id}/stages/bronze/assessment")->assertUnauthorized();
    }
}
