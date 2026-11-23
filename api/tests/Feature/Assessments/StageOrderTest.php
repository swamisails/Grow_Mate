<?php

namespace Tests\Feature\Assessments;

use App\Modules\Accounts\Models\User;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\StageLevel;

/**
 * The Stages unlock in order (AD-4): Bronze after Course Completed, Silver once Bronze is passed,
 * Gold once Silver is passed. Each Stage runs its own Retake walk, and the list stops at the first
 * Stage that isn't passed. Progress stays In progress until Gold is passed, then is Completed.
 */
class StageOrderTest extends AssessmentsTestCase
{
    private const UNAVAILABLE = ['message' => "This stage isn't open to you.", 'code' => 'ASSESSMENTS_STAGE_UNAVAILABLE'];

    private const LOCKED = ['message' => 'This stage is locked for now.', 'code' => 'ASSESSMENTS_STAGE_LOCKED'];

    private const ALREADY_PASSED = ['message' => 'You have already passed this stage.', 'code' => 'ASSESSMENTS_STAGE_ALREADY_PASSED'];

    private const BRONZE_PASSED = ['level' => 'bronze', 'state' => 'passed'];

    private const SILVER_PASSED = ['level' => 'silver', 'state' => 'passed'];

    public function test_a_bronze_pass_opens_silver_and_gold_stays_unavailable(): void
    {
        [$course, $priya] = $this->completed();

        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();

        $this->assertStages($priya, $course, [self::BRONZE_PASSED, ['level' => 'silver', 'state' => 'available']]);
        $this->read($priya, $course, StageLevel::Silver)->assertOk()->assertJsonPath('data.level', 'silver');
        $this->read($priya, $course, StageLevel::Gold)->assertConflict()->assertExactJson(self::UNAVAILABLE);
        $this->submit($priya, $course, StageLevel::Gold, true)->assertConflict()->assertExactJson(self::UNAVAILABLE);
        $this->read($priya, $course, StageLevel::Bronze)->assertConflict()->assertExactJson(self::ALREADY_PASSED);
        $this->assertSame(1, StageAttempt::query()->count());
        $this->assertInProgress($priya, $course);
    }

    public function test_one_silver_failure_leaves_silver_available(): void
    {
        [$course, $priya] = $this->completed();
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();

        $this->submit($priya, $course, StageLevel::Silver, false)->assertCreated()->assertExactJson(['data' => ['passed' => false]]);

        $this->assertStages($priya, $course, [self::BRONZE_PASSED, ['level' => 'silver', 'state' => 'available']]);
        $this->read($priya, $course, StageLevel::Silver)->assertOk();
        $this->assertInProgress($priya, $course);
    }

    public function test_a_silver_lock_keeps_bronze_passed_and_gold_hidden_until_silver_is_passed(): void
    {
        [$course, $priya] = $this->completed();
        $this->travelTo('2027-01-05 09:00:00');
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();
        $this->travelTo('2027-01-09 08:00:00');
        $this->submit($priya, $course, StageLevel::Silver, false)->assertCreated();
        $this->travelTo('2027-01-10 10:00:00');
        $this->submit($priya, $course, StageLevel::Silver, false)->assertCreated();

        $locked = [self::BRONZE_PASSED, ['level' => 'silver', 'state' => 'locked', 'locked_until' => '2027-02-10T10:00:00Z']];
        $this->assertStages($priya, $course, $locked);
        $this->read($priya, $course, StageLevel::Silver)->assertConflict()->assertExactJson(self::LOCKED);
        $this->submit($priya, $course, StageLevel::Silver, true)->assertConflict()->assertExactJson(self::LOCKED);
        $this->read($priya, $course, StageLevel::Gold)->assertConflict()->assertExactJson(self::UNAVAILABLE);
        $this->submit($priya, $course, StageLevel::Gold, true)->assertConflict()->assertExactJson(self::UNAVAILABLE);
        $this->read($priya, $course, StageLevel::Bronze)->assertConflict()->assertExactJson(self::ALREADY_PASSED);
        $this->assertSame(3, StageAttempt::query()->count());
        $this->assertInProgress($priya, $course);

        // A minute before the end it is still Locked.
        $this->travelTo('2027-02-10 09:59:00');
        $this->assertStages($priya, $course, $locked);

        // When the Lock ends, Silver is available again and Gold is still hidden.
        $this->travelTo('2027-02-10 10:00:00');
        $this->assertStages($priya, $course, [self::BRONZE_PASSED, ['level' => 'silver', 'state' => 'available']]);
        $this->read($priya, $course, StageLevel::Gold)->assertConflict()->assertExactJson(self::UNAVAILABLE);

        // Passing Silver opens Gold.
        $this->submit($priya, $course, StageLevel::Silver, true)->assertCreated()->assertExactJson(['data' => ['passed' => true]]);
        $this->assertStages($priya, $course, [self::BRONZE_PASSED, self::SILVER_PASSED, ['level' => 'gold', 'state' => 'available']]);
        $this->assertInProgress($priya, $course);
    }

    public function test_a_silver_pass_opens_gold(): void
    {
        [$course, $priya] = $this->completed();
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();

        $this->submit($priya, $course, StageLevel::Silver, true)->assertCreated()->assertExactJson(['data' => ['passed' => true]]);

        $this->assertStages($priya, $course, [self::BRONZE_PASSED, self::SILVER_PASSED, ['level' => 'gold', 'state' => 'available']]);
        $this->read($priya, $course, StageLevel::Gold)->assertOk()->assertJsonPath('data.level', 'gold');
        $this->read($priya, $course, StageLevel::Silver)->assertConflict()->assertExactJson(self::ALREADY_PASSED);
        $this->assertInProgress($priya, $course);
    }

    public function test_two_gold_failures_lock_gold_with_its_own_date(): void
    {
        [$course, $priya] = $this->completed();
        $this->travelTo('2027-01-05 09:00:00');
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();
        $this->travelTo('2027-01-06 09:00:00');
        $this->submit($priya, $course, StageLevel::Silver, false)->assertCreated();
        $this->submit($priya, $course, StageLevel::Silver, true)->assertCreated();
        $this->travelTo('2027-03-01 08:00:00');
        $this->submit($priya, $course, StageLevel::Gold, false)->assertCreated();
        $this->travelTo('2027-03-02 12:30:00');
        $this->submit($priya, $course, StageLevel::Gold, false)->assertCreated();

        $this->assertStages($priya, $course, [
            self::BRONZE_PASSED,
            self::SILVER_PASSED,
            ['level' => 'gold', 'state' => 'locked', 'locked_until' => '2027-04-02T12:30:00Z'],
        ]);
        $this->read($priya, $course, StageLevel::Gold)->assertConflict()->assertExactJson(self::LOCKED);
        $this->submit($priya, $course, StageLevel::Gold, true)->assertConflict()->assertExactJson(self::LOCKED);
        $this->assertInProgress($priya, $course);
    }

    public function test_when_all_three_are_passed_gold_is_refused_as_already_passed_and_progress_is_completed(): void
    {
        [$course, $priya] = $this->completed();
        foreach (StageLevel::cases() as $level) {
            $this->submit($priya, $course, $level, true)->assertCreated();
        }

        $this->assertStages($priya, $course, [self::BRONZE_PASSED, self::SILVER_PASSED, ['level' => 'gold', 'state' => 'passed']]);
        $this->read($priya, $course, StageLevel::Gold)->assertConflict()->assertExactJson(self::ALREADY_PASSED);
        $this->submit($priya, $course, StageLevel::Gold, true)->assertConflict()->assertExactJson(self::ALREADY_PASSED);
        $this->assertSame(3, StageAttempt::query()->count());
        $this->actingAs($priya)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertOk()
            ->assertExactJson(['data' => ['status' => 'completed']]);
    }

    public function test_a_stray_later_pass_opens_nothing_while_an_earlier_stage_is_unpassed(): void
    {
        [$course, $priya] = $this->completed();
        $this->strayPass($priya, $course, StageLevel::Silver);
        $this->strayPass($priya, $course, StageLevel::Gold);

        $this->assertStages($priya, $course, [['level' => 'bronze', 'state' => 'available']]);
        $this->read($priya, $course, StageLevel::Silver)->assertConflict()->assertExactJson(self::UNAVAILABLE);
        $this->submit($priya, $course, StageLevel::Silver, true)->assertConflict()->assertExactJson(self::UNAVAILABLE);
        $this->read($priya, $course, StageLevel::Gold)->assertConflict()->assertExactJson(self::UNAVAILABLE);

        // Once Bronze is passed, the stored Silver pass counts and Gold, also stored as passed, is listed passed.
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();
        $this->assertStages($priya, $course, [self::BRONZE_PASSED, self::SILVER_PASSED, ['level' => 'gold', 'state' => 'passed']]);
    }

    public function test_a_gold_pass_row_is_not_listed_while_silver_is_unpassed(): void
    {
        [$course, $priya] = $this->completed();
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();
        $this->strayPass($priya, $course, StageLevel::Gold);

        $this->assertStages($priya, $course, [self::BRONZE_PASSED, ['level' => 'silver', 'state' => 'available']]);
        $this->read($priya, $course, StageLevel::Gold)->assertConflict()->assertExactJson(self::UNAVAILABLE);
    }

    public function test_before_course_completed_no_stage_is_listed_even_with_stored_passes(): void
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course, 'live');
        foreach (StageLevel::cases() as $level) {
            $this->strayPass($priya, $course, $level);
        }

        $this->assertStages($priya, $course, []);
        foreach (StageLevel::cases() as $level) {
            $this->read($priya, $course, $level)->assertConflict()->assertExactJson(self::UNAVAILABLE);
        }
    }

    private function strayPass(User $learner, Course $course, StageLevel $level): void
    {
        StageAttempt::factory()->create([
            'learner_id' => $learner->id,
            'course_id' => $course->id,
            'stage_id' => $this->stage($course, $level)->id,
        ]);
    }

    /**
     * @param  list<array<string, string>>  $stages
     */
    private function assertStages(User $learner, Course $course, array $stages): void
    {
        $response = $this->actingAs($learner)->getJson("/api/v1/courses/{$course->id}/stages")
            ->assertOk()
            ->assertExactJson(['data' => $stages]);
        $this->assertHidesAnswersAndScores($response);
    }

    private function assertInProgress(User $learner, Course $course): void
    {
        $this->actingAs($learner)->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertOk()
            ->assertExactJson(['data' => ['status' => 'in_progress']]);
    }
}
