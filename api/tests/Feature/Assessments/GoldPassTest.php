<?php

namespace Tests\Feature\Assessments;

use App\Modules\Accounts\Models\User;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\StageLevel;
use App\Modules\Mentors\Actions\GrantMentor;
use App\Modules\Mentors\Models\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;

/**
 * Passing Gold makes the Learner a Mentor for the Course (R19, AD-7) and their Progress Completed
 * (AD-4). The grant is silent: no notice, no route shown (C6, C8).
 */
class GoldPassTest extends AssessmentsTestCase
{
    public function test_a_gold_pass_grants_mentor_and_completes_progress(): void
    {
        [$course, $priya] = $this->completedWithBronzeAndSilver();

        $this->submit($priya, $course, StageLevel::Gold, true)->assertCreated()->assertExactJson(['data' => ['passed' => true]]);

        $this->assertDatabaseHas('mentor_routes', ['user_id' => $priya->id, 'course_id' => $course->id, 'route' => 'gold_pass']);
        $this->assertSame(1, DB::table('mentor_routes')->count());
        $this->assertDatabaseCount('notifications', 0);
        $this->assertProgress($priya, $course, 'completed');
        $this->actingAs($priya)->getJson('/api/v1/home')->assertOk()->assertExactJson(['data' => [
            'learning' => [[
                'course_id' => $course->id,
                'course_title' => 'Python Basics',
                'status' => 'completed',
                'match_id' => null,
            ]],
            'mentoring' => [],
        ]]);
        $this->actingAs($priya)->getJson('/api/v1/upskilling')->assertOk()->assertExactJson(['data' => []]);

        $sam = $this->employee('Sam Lindqvist');
        $mentors = $this->actingAs($sam)->getJson("/api/v1/courses/{$course->id}/mentors")->assertOk();
        $mentors->assertExactJson(['data' => [['id' => $priya->id, 'name' => 'Priya Nair']]]);
        $this->assertStringNotContainsString('route', (string) $mentors->getContent());
        $this->assertStringNotContainsString('gold_pass', (string) $mentors->getContent());
    }

    public function test_another_employee_can_request_the_new_mentor(): void
    {
        [$course, $priya] = $this->completedWithBronzeAndSilver();
        $this->submit($priya, $course, StageLevel::Gold, true)->assertCreated();

        $sam = $this->employee('Sam Lindqvist');
        $this->actingAs($sam)->postJson("/api/v1/courses/{$course->id}/requests", ['mentor_id' => $priya->id])
            ->assertCreated()
            ->assertJsonPath('data.mentor_id', $priya->id)
            ->assertJsonPath('data.course_id', $course->id);
        $this->assertDatabaseHas('requests', ['learner_id' => $sam->id, 'mentor_id' => $priya->id, 'course_id' => $course->id]);
    }

    public function test_a_gold_failure_grants_nothing_and_stays_in_progress(): void
    {
        [$course, $priya] = $this->completedWithBronzeAndSilver();

        $this->submit($priya, $course, StageLevel::Gold, false)->assertCreated()->assertExactJson(['data' => ['passed' => false]]);

        $this->assertDatabaseCount('mentor_routes', 0);
        $this->assertProgress($priya, $course, 'in_progress');
        $this->actingAs($priya)->getJson('/api/v1/upskilling')->assertOk()->assertExactJson(['data' => [
            ['person_name' => 'Priya Nair', 'course_title' => 'Python Basics', 'status' => 'in_progress'],
        ]]);
    }

    public function test_an_existing_mentor_keeps_their_route_and_is_completed(): void
    {
        [$course, $priya] = $this->completedWithBronzeAndSilver();
        app(GrantMentor::class)->handle($priya->id, $course->id, Route::RegistrationApproval);

        $this->submit($priya, $course, StageLevel::Gold, true)->assertCreated()->assertExactJson(['data' => ['passed' => true]]);

        $this->assertSame(1, DB::table('mentor_routes')->count());
        $this->assertDatabaseHas('mentor_routes', ['user_id' => $priya->id, 'course_id' => $course->id, 'route' => 'registration_approval']);
        $this->assertProgress($priya, $course, 'completed');
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_bronze_and_silver_passes_grant_nothing_and_stay_in_progress(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);

        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();
        $this->assertDatabaseCount('mentor_routes', 0);
        $this->assertProgress($priya, $course, 'in_progress');

        $this->submit($priya, $course, StageLevel::Silver, true)->assertCreated();
        $this->assertDatabaseCount('mentor_routes', 0);
        $this->assertProgress($priya, $course, 'in_progress');
    }

    public function test_an_earlier_quit_is_in_progress_through_the_stages_and_completed_after_gold(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course, 'quit');
        $this->match($priya, $course);

        $this->assertProgress($priya, $course, 'in_progress');
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();
        $this->assertProgress($priya, $course, 'in_progress');
        $this->submit($priya, $course, StageLevel::Silver, true)->assertCreated();
        $this->assertProgress($priya, $course, 'in_progress');
        $this->submit($priya, $course, StageLevel::Gold, true)->assertCreated();
        $this->assertProgress($priya, $course, 'completed');
        $this->assertDatabaseHas('mentor_routes', ['user_id' => $priya->id, 'course_id' => $course->id, 'route' => 'gold_pass']);
    }

    public function test_a_stray_gold_pass_behind_an_unpassed_silver_is_not_completed(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();
        StageAttempt::factory()->create([
            'learner_id' => $priya->id,
            'course_id' => $course->id,
            'stage_id' => $this->stage($course, StageLevel::Gold)->id,
        ]);

        $this->assertProgress($priya, $course, 'in_progress');
    }

    /**
     * A Learner after Course Completed with Bronze and Silver already passed.
     *
     * @return array{Course, User}
     */
    private function completedWithBronzeAndSilver(): array
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);
        foreach ([StageLevel::Bronze, StageLevel::Silver] as $level) {
            StageAttempt::factory()->create([
                'learner_id' => $priya->id,
                'course_id' => $course->id,
                'stage_id' => $this->stage($course, $level)->id,
            ]);
        }

        return [$course, $priya];
    }

    private function submit(User $learner, Course $course, StageLevel $level, bool $pass): TestResponse
    {
        return $this->actingAs($learner)->postJson(
            "/api/v1/courses/{$course->id}/stages/{$level->value}/attempts",
            ['answers' => $this->answers($course, $level, [$pass ? 0 : 1])],
        );
    }

    private function assertProgress(User $learner, Course $course, string $status): void
    {
        $this->actingAs($learner)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertOk()
            ->assertExactJson(['data' => ['status' => $status]]);
    }
}
