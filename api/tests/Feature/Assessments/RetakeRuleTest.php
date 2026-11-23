<?php

namespace Tests\Feature\Assessments;

use App\Modules\Accounts\Models\User;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

/**
 * The Retake rule (AD-5): two attempts, then a one-month Lock from the second failure, then two
 * again. Derived from the stored attempts against `now()`, never stored.
 */
class RetakeRuleTest extends AssessmentsTestCase
{
    private const LOCKED = ['message' => 'This stage is locked for now.', 'code' => 'ASSESSMENTS_STAGE_LOCKED'];

    public function test_one_failure_leaves_bronze_available(): void
    {
        [$course, $priya] = $this->completed();
        $this->travelTo('2027-01-10 09:00:00');

        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();

        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'available']);
        $this->read($priya, $course, StageLevel::Bronze)->assertOk();
    }

    public function test_the_second_failure_locks_bronze_for_a_month_and_refuses_reads_and_submits_until_it_ends(): void
    {
        [$course, $priya] = $this->completed();
        $this->travelTo('2027-01-09 08:00:00');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();
        $this->travelTo('2027-01-10 10:00:00');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();

        $response = $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'locked', 'locked_until' => '2027-02-10T10:00:00Z']);
        $this->assertHidesAnswersAndScores($response);
        $this->assertStringNotContainsString('attempt', (string) $response->getContent());

        // A minute before the end it is still Locked: the read and the submit are refused, nothing is stored.
        $this->travelTo('2027-02-10 09:59:00');
        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'locked', 'locked_until' => '2027-02-10T10:00:00Z']);
        $this->read($priya, $course, StageLevel::Bronze)->assertConflict()->assertExactJson(self::LOCKED);
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertConflict()->assertExactJson(self::LOCKED);
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertConflict()->assertExactJson(self::LOCKED);
        $this->assertSame(2, StageAttempt::query()->count());

        // From `locked_until` on, Bronze is available with two fresh attempts.
        $this->travelTo('2027-02-10 10:00:00');
        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'available']);
        $this->read($priya, $course, StageLevel::Bronze)->assertOk();
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();
        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'available']);
    }

    public function test_two_more_failures_after_the_lock_lock_it_again_a_month_after_the_fourth(): void
    {
        [$course, $priya] = $this->completed();
        $this->travelTo('2027-01-09 08:00:00');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();
        $this->travelTo('2027-01-10 10:00:00');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();

        $this->travelTo('2027-02-12 11:00:00');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();
        $this->travelTo('2027-02-15 14:30:00');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();

        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'locked', 'locked_until' => '2027-03-15T14:30:00Z']);
        $this->travelTo('2027-03-15 14:29:59');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertConflict()->assertExactJson(self::LOCKED);

        // After the second Lock, a pass ends it.
        $this->travelTo('2027-03-15 14:30:00');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated()->assertExactJson(['data' => ['passed' => true]]);
        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'passed'], ['level' => 'silver', 'state' => 'available']);
        $this->assertSame(6, StageAttempt::query()->count());
    }

    public function test_a_lock_from_the_31st_of_january_ends_on_the_last_day_of_february(): void
    {
        foreach (['2027-01-31 10:00:00' => '2027-02-28T10:00:00Z', '2028-01-31 10:00:00' => '2028-02-29T10:00:00Z'] as $second => $until) {
            $course = $this->publishedCourse(title: "Course {$second}");
            $priya = $this->employee("Learner {$second}");
            $this->match($priya, $course);
            $this->travelTo(Carbon::parse($second)->subHour());
            $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();
            $this->travelTo($second);
            $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();

            $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'locked', 'locked_until' => $until]);
        }
    }

    public function test_a_pass_after_one_failure_is_passed(): void
    {
        [$course, $priya] = $this->completed();
        $this->travelTo('2027-01-10 09:00:00');

        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();
        $this->submit($priya, $course, StageLevel::Bronze, true)->assertCreated();

        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'passed'], ['level' => 'silver', 'state' => 'available']);
    }

    public function test_the_walk_follows_id_order_and_counts_only_this_learner_course_and_stage(): void
    {
        [$course, $priya] = $this->completed();
        $other = $this->publishedCourse(title: 'SQL Fundamentals');
        $sam = $this->employee('Sam');
        $this->travelTo('2027-01-10 10:00:00');

        // A failure by someone else, on another Course and on another Stage of this Course: none count.
        StageAttempt::factory()->failed()->create(['learner_id' => $sam->id, 'course_id' => $course->id, 'submitted_at' => now()]);
        StageAttempt::factory()->failed()->create(['learner_id' => $priya->id, 'course_id' => $other->id, 'submitted_at' => now()]);
        StageAttempt::factory()->failed()->create([
            'learner_id' => $priya->id,
            'course_id' => $course->id,
            'stage_id' => $this->stage($course, StageLevel::Silver)->id,
            'submitted_at' => now(),
        ]);
        StageAttempt::factory()->failed()->create(['learner_id' => $priya->id, 'course_id' => $course->id, 'submitted_at' => now()]);
        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'available']);

        // The Lock is a month after the attempt that is second in `id` order, whatever its `submitted_at`.
        StageAttempt::factory()->failed()->create(['learner_id' => $priya->id, 'course_id' => $course->id, 'submitted_at' => now()->subDay()]);
        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'locked', 'locked_until' => '2027-02-09T10:00:00Z']);
    }

    public function test_a_quit_or_a_new_match_leaves_the_lock_in_place(): void
    {
        [$course, $priya] = $this->completed();
        $this->travelTo('2027-01-10 09:00:00');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();
        $this->travelTo('2027-01-10 10:00:00');
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertCreated();

        $this->travelTo('2027-01-20 10:00:00');
        $this->match($priya, $course, 'quit');
        $this->match($priya, $course, 'live');

        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'locked', 'locked_until' => '2027-02-10T10:00:00Z']);
        $this->submit($priya, $course, StageLevel::Bronze, false)->assertConflict()->assertExactJson(self::LOCKED);

        // A second Course Completed changes nothing either.
        $this->match($priya, $course);
        $this->assertStages($priya, $course, ['level' => 'bronze', 'state' => 'locked', 'locked_until' => '2027-02-10T10:00:00Z']);
    }

    /**
     * @param  array<string, string>  ...$stages  Bronze first, then any later Stage it opened
     */
    private function assertStages(User $learner, Course $course, array ...$stages): TestResponse
    {
        return $this->actingAs($learner)->getJson("/api/v1/courses/{$course->id}/stages")
            ->assertOk()
            ->assertExactJson(['data' => $stages]);
    }
}
