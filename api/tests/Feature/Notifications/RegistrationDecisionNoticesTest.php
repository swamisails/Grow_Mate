<?php

namespace Tests\Feature\Notifications;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Actions\DecideRegistration;
use App\Modules\Mentors\Actions\SubmitMentorCheck;
use App\Modules\Mentors\Exceptions\MentorRuleViolation;
use App\Modules\Mentors\Models\MentorCheck;
use App\Modules\Mentors\Models\Outcome;
use App\Modules\Mentors\Models\RegistrationDecision;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Testing\TestResponse;

/** Each Registration decision sends its Employee one notice once it commits (R3, AD-11). */
class RegistrationDecisionNoticesTest extends NotificationsTestCase
{
    private Course $python;

    private Course $git;

    private User $sam;

    protected function setUp(): void
    {
        parent::setUp();

        $this->python = Course::factory()->create(['title' => 'Python Basics', 'published_at' => now()]);
        $this->git = Course::factory()->create(['title' => 'Git Essentials', 'published_at' => now()]);
        $this->travel(1)->seconds();
        $this->sam = $this->employee('Sam Lindqvist');
    }

    /**
     * Sam's Mentor check naming `$courses`; returns the `mentor_check_courses` ids, in order.
     *
     * @return list<int>
     */
    private function check(Course ...$courses): array
    {
        app(SubmitMentorCheck::class)->handle($this->sam->id, array_map(fn (Course $course): int => $course->id, $courses));

        return MentorCheck::query()->where('user_id', $this->sam->id)->sole()->courses()->orderBy('id')->pluck('id')->all();
    }

    private function decide(int|string $id, string $decision): TestResponse
    {
        return $this->postJson("/api/v1/admin/registration-decisions/{$id}/{$decision}");
    }

    private function signedInAdmin(): static
    {
        return $this->actingAs(User::factory()->admin()->create());
    }

    private function samsNotices(): TestResponse
    {
        return $this->actingAs($this->sam)->getJson('/api/v1/notices')->assertOk();
    }

    public function test_an_approval_sends_the_employee_one_approved_notice_without_a_route(): void
    {
        [$samPython] = $this->check($this->python, $this->git);

        $this->signedInAdmin()->decide($samPython, 'approve')->assertCreated();

        $notice = $this->storedNotices()[0];
        $this->assertCount(1, $this->storedNotices());
        $this->assertSame($this->sam->id, (int) $notice->notifiable_id);
        $response = $this->samsNotices()->assertExactJson(['data' => [[
            'id' => $notice->id,
            'type' => 'registration_decision',
            'occurred_at' => now()->toIso8601ZuluString(),
            'course_title' => 'Python Basics',
            'outcome' => 'approved',
        ]]]);
        $this->assertStringNotContainsString('route', $response->getContent());
    }

    public function test_a_refusal_sends_a_refused_notice(): void
    {
        [, $samGit] = $this->check($this->python, $this->git);

        $this->signedInAdmin()->decide($samGit, 'refuse')->assertCreated();

        $this->samsNotices()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.course_title', 'Git Essentials')
            ->assertJsonPath('data.0.outcome', 'refused');
    }

    public function test_two_decisions_within_one_second_list_newest_first(): void
    {
        [$samPython, $samGit] = $this->check($this->python, $this->git);

        $this->signedInAdmin()->decide($samGit, 'refuse')->assertCreated();
        $this->decide($samPython, 'approve')->assertCreated();

        $this->samsNotices()->assertJsonPath('data.*.course_title', ['Python Basics', 'Git Essentials']);
    }

    public function test_a_second_decision_sends_nothing(): void
    {
        [$samPython] = $this->check($this->python);
        $this->signedInAdmin()->decide($samPython, 'approve')->assertCreated();

        $this->decide($samPython, 'refuse')->assertConflict();
        $this->decide($samPython, 'approve')->assertConflict();

        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_an_unknown_id_sends_nothing(): void
    {
        $this->check($this->python);

        $this->signedInAdmin()->decide(999, 'approve')->assertNotFound();
        $this->decide(999, 'refuse')->assertNotFound();

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_a_concurrent_duplicate_decision_sends_no_notice(): void
    {
        [$samPython] = $this->check($this->python);
        // Another request commits a decision on the pair after this one has looked and found none, so
        // this decision is refused at its insert and never reaches the notice.
        Event::listen('eloquent.creating: '.RegistrationDecision::class, function (RegistrationDecision $decision): void {
            DB::table('registration_decisions')->insert([
                'user_id' => $decision->user_id,
                'course_id' => $decision->course_id,
                'outcome' => 'refused',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        try {
            app(DecideRegistration::class)->handle($samPython, Outcome::Approved);
            $this->fail('Expected the duplicate to be refused.');
        } catch (MentorRuleViolation) {
        }

        $this->assertDatabaseCount('notifications', 0);
    }
}
