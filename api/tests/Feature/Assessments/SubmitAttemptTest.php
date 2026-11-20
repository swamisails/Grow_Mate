<?php

namespace Tests\Feature\Assessments;

use App\Modules\Accounts\Models\User;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SubmitAttemptTest extends AssessmentsTestCase
{
    public function test_a_pass_is_stored_with_the_pass_mark_used_and_bronze_then_reads_passed(): void
    {
        $this->travelTo('2026-11-20 10:00:00');
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);

        $response = $this->actingAs($priya)->postJson(
            "/api/v1/courses/{$course->id}/stages/bronze/attempts",
            ['answers' => $this->answers($course, StageLevel::Bronze, [0])],
        );

        $response->assertCreated()->assertExactJson(['data' => ['passed' => true]]);
        $this->assertHidesAnswersAndScores($response);

        $attempt = StageAttempt::query()->sole();
        $this->assertSame($priya->id, $attempt->learner_id);
        $this->assertSame($course->id, $attempt->course_id);
        $this->assertSame($this->stage($course, StageLevel::Bronze)->id, $attempt->stage_id);
        $this->assertSame(1, $attempt->correct_count);
        $this->assertSame(1, $attempt->question_count);
        $this->assertSame(70, $attempt->pass_mark);
        $this->assertTrue($attempt->passed);
        $this->assertSame('2026-11-20T10:00:00.000000Z', $attempt->submitted_at->toJSON());

        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages")
            ->assertExactJson(['data' => [['level' => 'bronze', 'state' => 'passed']]]);
    }

    public function test_two_of_three_fails_a_pass_mark_of_67(): void
    {
        $course = $this->publishedCourse(['bronze' => ['pass_mark' => 67, 'questions' => [['*A', 'B'], ['*A', 'B'], ['*A', 'B']]]]);
        $priya = $this->employee();
        $this->match($priya, $course);

        $this->actingAs($priya)->postJson(
            "/api/v1/courses/{$course->id}/stages/bronze/attempts",
            ['answers' => $this->answers($course, StageLevel::Bronze, [0, 0, 1])],
        )->assertCreated()->assertExactJson(['data' => ['passed' => false]]);

        $attempt = StageAttempt::query()->sole();
        $this->assertSame([2, 3, 67, false], [$attempt->correct_count, $attempt->question_count, $attempt->pass_mark, $attempt->passed]);

        // A fail leaves Bronze available, and a retake is scored on its own.
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/stages")
            ->assertExactJson(['data' => [['level' => 'bronze', 'state' => 'available']]]);
        $this->actingAs($priya)->postJson(
            "/api/v1/courses/{$course->id}/stages/bronze/attempts",
            ['answers' => $this->answers($course, StageLevel::Bronze, [0, 0, 0])],
        )->assertCreated()->assertExactJson(['data' => ['passed' => true]]);
    }

    public function test_two_of_three_passes_a_pass_mark_of_66(): void
    {
        $course = $this->publishedCourse(['bronze' => ['pass_mark' => 66, 'questions' => [['*A', 'B'], ['*A', 'B'], ['*A', 'B']]]]);
        $priya = $this->employee();
        $this->match($priya, $course);

        $this->actingAs($priya)->postJson(
            "/api/v1/courses/{$course->id}/stages/bronze/attempts",
            ['answers' => $this->answers($course, StageLevel::Bronze, [1, 0, 0])],
        )->assertCreated()->assertExactJson(['data' => ['passed' => true]]);
    }

    public function test_before_course_completed_a_submit_is_refused_and_nothing_is_stored(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $sam = $this->employee('Sam');
        $this->match($priya, $course, 'live');
        $this->match($sam, $course, 'quit');

        foreach ([$priya, $sam, $this->employee('No Match')] as $learner) {
            $this->actingAs($learner)->postJson(
                "/api/v1/courses/{$course->id}/stages/bronze/attempts",
                ['answers' => $this->answers($course, StageLevel::Bronze, [0])],
            )->assertConflict()->assertExactJson(['message' => "This stage isn't open to you.", 'code' => 'ASSESSMENTS_STAGE_UNAVAILABLE']);
        }
        $this->assertSame(0, StageAttempt::query()->count());
    }

    public function test_after_a_bronze_pass_a_submit_is_refused_and_nothing_is_stored(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);
        $url = "/api/v1/courses/{$course->id}/stages/bronze/attempts";
        $body = ['answers' => $this->answers($course, StageLevel::Bronze, [0])];

        $this->actingAs($priya)->postJson($url, $body)->assertCreated();
        $this->actingAs($priya)->postJson($url, $body)
            ->assertConflict()->assertExactJson(['message' => 'You have already passed this stage.', 'code' => 'ASSESSMENTS_STAGE_ALREADY_PASSED']);
        $this->assertSame(1, StageAttempt::query()->count());
    }

    public function test_silver_and_gold_are_unavailable_after_a_bronze_pass(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);
        StageAttempt::factory()->create(['learner_id' => $priya->id, 'course_id' => $course->id]);

        foreach ([StageLevel::Silver, StageLevel::Gold] as $level) {
            $this->actingAs($priya)->postJson(
                "/api/v1/courses/{$course->id}/stages/{$level->value}/attempts",
                ['answers' => $this->answers($course, $level, [0])],
            )->assertConflict()->assertJsonPath('code', 'ASSESSMENTS_STAGE_UNAVAILABLE');
        }
        $this->assertSame(1, StageAttempt::query()->count());
    }

    public function test_answers_that_do_not_fit_the_stage_are_refused_and_nothing_is_stored(): void
    {
        $course = $this->publishedCourse([
            'bronze' => ['pass_mark' => 50, 'questions' => [['*A', 'B'], ['*A', 'B']]],
            'silver' => ['pass_mark' => 50, 'questions' => [['*A', 'B']]],
        ]);
        $priya = $this->employee();
        $this->match($priya, $course);
        [$first, $second] = $this->answers($course, StageLevel::Bronze, [0, 0]);
        [$silver] = $this->answers($course, StageLevel::Silver, [0]);
        $url = "/api/v1/courses/{$course->id}/stages/bronze/attempts";

        $bodies = [
            'missing question' => ['answers' => [$first]],
            'extra question' => ['answers' => [$first, $second, $silver]],
            'option of another question' => ['answers' => [$first, ['question_id' => $second['question_id'], 'option_id' => $first['option_id']]]],
            'question twice' => ['answers' => [$first, $first]],
            'no answers' => ['answers' => []],
            'no list' => [],
            'string ids' => ['answers' => [
                ['question_id' => (string) $first['question_id'], 'option_id' => $first['option_id']],
                $second,
            ]],
            'a map, not a list' => ['answers' => ['a' => $first, 'b' => $second]],
        ];

        foreach ($bodies as $case => $body) {
            $response = $this->actingAs($priya)->postJson($url, $body);
            $this->assertSame(422, $response->status(), $case);
            $this->assertArrayHasKey('errors', $response->json(), $case);
        }
        $this->assertSame(0, StageAttempt::query()->count());
    }

    public function test_a_draft_or_missing_course_is_not_found(): void
    {
        $priya = $this->employee();
        $draft = Course::factory()->create();

        $this->actingAs($priya)->postJson("/api/v1/courses/{$draft->id}/stages/bronze/attempts", ['answers' => []])->assertNotFound();
        $this->actingAs($priya)->postJson('/api/v1/courses/999999/stages/bronze/attempts', ['answers' => []])->assertNotFound();
    }

    public function test_an_admin_is_forbidden_and_a_signed_out_caller_is_unauthorized(): void
    {
        $course = $this->publishedCourse();
        $admin = User::factory()->admin()->create();
        $this->match($admin, $course);
        $body = ['answers' => $this->answers($course, StageLevel::Bronze, [0])];

        $this->actingAs($admin)->postJson("/api/v1/courses/{$course->id}/stages/bronze/attempts", $body)->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->postJson("/api/v1/courses/{$course->id}/stages/bronze/attempts", $body)->assertUnauthorized();
        $this->assertSame(0, StageAttempt::query()->count());
    }

    public function test_attempts_have_no_match_reference(): void
    {
        $this->assertSame(
            ['id', 'learner_id', 'course_id', 'stage_id', 'correct_count', 'question_count', 'pass_mark', 'passed', 'submitted_at'],
            Schema::getColumnListing('stage_attempts'),
        );
        foreach (Schema::getColumnListing('stage_attempts') as $column) {
            $this->assertStringNotContainsString('match', $column);
            $this->assertStringNotContainsString('request', $column);
        }
        $this->assertSame([], DB::select("select * from pragma_foreign_key_list('stage_attempts') where \"table\" in ('matches', 'requests')"));
    }
}
