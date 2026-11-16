<?php

namespace Tests\Feature\Mentors;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Actions\DecideRegistration;
use App\Modules\Mentors\Actions\SubmitMentorCheck;
use App\Modules\Mentors\Exceptions\MentorRuleViolation;
use App\Modules\Mentors\Models\MentorCheck;
use App\Modules\Mentors\Models\MentorRoute;
use App\Modules\Mentors\Models\Outcome;
use App\Modules\Mentors\Models\RegistrationDecision;
use App\Modules\Mentors\Models\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;

class RegistrationDecisionsTest extends MentorsTestCase
{
    private Course $python;

    private Course $git;

    private Course $sql;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(now()->startOfSecond());
        $this->python = $this->course('Python Basics');
        $this->git = $this->course('Git Essentials');
        $this->sql = $this->course('SQL Fundamentals');
        // Employees made from here on may name all three (published before their accounts).
        $this->travel(1)->seconds();
    }

    private function course(string $title): Course
    {
        return Course::factory()->create(['title' => $title, 'published_at' => now()]);
    }

    /**
     * The Employee's Mentor check naming `$courses`, in order; returns the `mentor_check_courses` ids.
     *
     * @return list<int>
     */
    private function check(User $employee, Course ...$courses): array
    {
        app(SubmitMentorCheck::class)->handle($employee->id, array_map(fn (Course $course): int => $course->id, $courses));

        return MentorCheck::query()->where('user_id', $employee->id)->sole()->courses()->orderBy('id')->pluck('id')->all();
    }

    private function signedInAdmin(): static
    {
        return $this->actingAs(User::factory()->admin()->create());
    }

    private function decide(int $id, string $decision): TestResponse
    {
        return $this->postJson("/api/v1/admin/registration-decisions/{$id}/{$decision}");
    }

    /**
     * @return array{decisions: array<int, array<string, mixed>>, routes: array<int, array<string, mixed>>}
     */
    private function snapshot(): array
    {
        return [
            'decisions' => RegistrationDecision::query()->orderBy('id')->get()->toArray(),
            'routes' => MentorRoute::query()->orderBy('id')->get()->toArray(),
        ];
    }

    public function test_lists_every_mentor_check_course_by_id_with_its_outcome(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $priya = $this->employee('Priya Nair');
        $skipper = $this->employee('Lee Skipper');
        [$samPython, $samSql] = $this->check($sam, $this->python, $this->sql);
        [$priyaGit] = $this->check($priya, $this->git);
        // A skip names no Course, so it has no row.
        $this->check($skipper);
        app(DecideRegistration::class)->handle($samSql, Outcome::Refused);

        $response = $this->signedInAdmin()->getJson('/api/v1/admin/registration-decisions')
            ->assertOk()
            ->assertExactJson(['data' => [
                ['id' => $samPython, 'employee_name' => 'Sam Lindqvist', 'course_title' => 'Python Basics', 'outcome' => null],
                ['id' => $samSql, 'employee_name' => 'Sam Lindqvist', 'course_title' => 'SQL Fundamentals', 'outcome' => 'refused'],
                ['id' => $priyaGit, 'employee_name' => 'Priya Nair', 'course_title' => 'Git Essentials', 'outcome' => null],
            ]]);

        $this->assertStringNotContainsString('route', $response->getContent());
    }

    public function test_with_no_mentor_check_courses_the_list_is_empty(): void
    {
        $this->check($this->employee('Lee Skipper'));

        $this->signedInAdmin()->getJson('/api/v1/admin/registration-decisions')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_approving_stores_the_decision_and_makes_the_employee_a_mentor(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $priya = $this->employee('Priya Nair');
        [$samPython] = $this->check($sam, $this->python, $this->git);

        $response = $this->signedInAdmin()->decide($samPython, 'approve')
            ->assertCreated()
            ->assertExactJson(['data' => ['id' => $samPython, 'outcome' => 'approved']]);
        $this->assertStringNotContainsString('route', $response->getContent());

        $decision = RegistrationDecision::query()->sole();
        $this->assertSame([$sam->id, $this->python->id, Outcome::Approved], [$decision->user_id, $decision->course_id, $decision->outcome]);
        $grant = MentorRoute::query()->sole();
        $this->assertSame([$sam->id, $this->python->id, Route::RegistrationApproval], [$grant->user_id, $grant->course_id, $grant->route]);
        $this->getJson('/api/v1/admin/registration-decisions')
            ->assertJsonPath('data.0.outcome', 'approved')
            ->assertJsonPath('data.1.outcome', null);

        $this->actingAs($priya)->getJson("/api/v1/courses/{$this->python->id}/mentors")
            ->assertOk()
            ->assertExactJson(['data' => [['id' => $sam->id, 'name' => 'Sam Lindqvist']]]);
        $this->getJson("/api/v1/courses/{$this->git->id}/mentors")->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_approving_a_pair_that_is_already_granted_keeps_the_first_route(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        [$samPython] = $this->check($sam, $this->python);
        $this->grant($sam, $this->python, Route::GoldPass);

        $this->signedInAdmin()->decide($samPython, 'approve')
            ->assertCreated()
            ->assertExactJson(['data' => ['id' => $samPython, 'outcome' => 'approved']]);

        $this->assertSame(Outcome::Approved, RegistrationDecision::query()->sole()->outcome);
        $this->assertSame(Route::GoldPass, MentorRoute::query()->sole()->route);
    }

    public function test_refusing_stores_the_decision_and_grants_nothing(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $priya = $this->employee('Priya Nair');
        [$samPython] = $this->check($sam, $this->python);

        $response = $this->signedInAdmin()->decide($samPython, 'refuse')
            ->assertCreated()
            ->assertExactJson(['data' => ['id' => $samPython, 'outcome' => 'refused']]);
        $this->assertStringNotContainsString('route', $response->getContent());

        $decision = RegistrationDecision::query()->sole();
        $this->assertSame([$sam->id, $this->python->id, Outcome::Refused], [$decision->user_id, $decision->course_id, $decision->outcome]);
        $this->assertDatabaseCount('mentor_routes', 0);
        $this->actingAs($priya)->getJson("/api/v1/courses/{$this->python->id}/mentors")->assertOk()->assertExactJson(['data' => []]);
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function secondDecisions(): array
    {
        return [
            'approve then approve' => ['approve', 'approve'],
            'approve then refuse' => ['approve', 'refuse'],
            'refuse then approve' => ['refuse', 'approve'],
            'refuse then refuse' => ['refuse', 'refuse'],
        ];
    }

    #[DataProvider('secondDecisions')]
    public function test_a_second_decision_is_refused_and_changes_nothing(string $first, string $second): void
    {
        [$samPython] = $this->check($this->employee('Sam Lindqvist'), $this->python);
        $this->signedInAdmin()->decide($samPython, $first)->assertCreated();
        $before = $this->snapshot();

        Exceptions::fake();
        $this->decide($samPython, $second)
            ->assertConflict()
            ->assertExactJson(['message' => 'This course has already been decided.', 'code' => 'MENTORS_ALREADY_DECIDED']);

        // An expected refusal is never reported to the log.
        Exceptions::assertNothingReported();
        $this->assertSame($before, $this->snapshot());
    }

    public function test_a_concurrent_duplicate_that_hits_the_unique_key_is_refused_without_a_grant(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        [$samPython] = $this->check($sam, $this->python);
        // Another request commits a decision on the pair after this one has looked and found none.
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
        } catch (MentorRuleViolation $violation) {
            $this->assertSame('MENTORS_ALREADY_DECIDED', $violation->errorCode->value);
        }

        $this->assertDatabaseCount('mentor_routes', 0);
    }

    public function test_a_concurrent_duplicate_answers_409_over_http(): void
    {
        [$samPython] = $this->check($this->employee('Sam Lindqvist'), $this->python);
        Event::listen('eloquent.creating: '.RegistrationDecision::class, function (RegistrationDecision $decision): void {
            DB::table('registration_decisions')->insert([
                'user_id' => $decision->user_id,
                'course_id' => $decision->course_id,
                'outcome' => 'approved',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        $this->signedInAdmin()->decide($samPython, 'refuse')
            ->assertConflict()
            ->assertExactJson(['message' => 'This course has already been decided.', 'code' => 'MENTORS_ALREADY_DECIDED']);
        $this->assertDatabaseCount('mentor_routes', 0);
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function unknownIds(): array
    {
        return [
            'unknown approve' => ['999', 'approve'],
            'unknown refuse' => ['999', 'refuse'],
            'not a number, approve' => ['abc', 'approve'],
            'not a number, refuse' => ['abc', 'refuse'],
            'too long for an int' => ['9999999999999999999', 'approve'],
        ];
    }

    #[DataProvider('unknownIds')]
    public function test_an_unknown_or_bad_id_is_a_404_and_changes_nothing(string $id, string $decision): void
    {
        $this->check($this->employee('Sam Lindqvist'), $this->python);

        $this->signedInAdmin()->postJson("/api/v1/admin/registration-decisions/{$id}/{$decision}")->assertNotFound();

        $this->assertDatabaseCount('registration_decisions', 0);
        $this->assertDatabaseCount('mentor_routes', 0);
    }

    public function test_guest_and_employee_have_no_access(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        [$samPython] = $this->check($sam, $this->python);

        $this->getJson('/api/v1/admin/registration-decisions')->assertUnauthorized();
        $this->decide($samPython, 'approve')->assertUnauthorized();
        $this->decide($samPython, 'refuse')->assertUnauthorized();

        $this->actingAs($sam);
        $this->getJson('/api/v1/admin/registration-decisions')->assertForbidden();
        $this->decide($samPython, 'approve')->assertForbidden();
        $this->decide($samPython, 'refuse')->assertForbidden();

        $this->assertDatabaseCount('registration_decisions', 0);
        $this->assertDatabaseCount('mentor_routes', 0);
    }
}
