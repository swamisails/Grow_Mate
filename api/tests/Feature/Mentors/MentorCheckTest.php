<?php

namespace Tests\Feature\Mentors;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Actions\SubmitMentorCheck;
use App\Modules\Mentors\Exceptions\MentorRuleViolation;
use App\Modules\Mentors\Models\MentorCheck;
use App\Modules\Mentors\Models\MentorCheckCourse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\DataProvider;

class MentorCheckTest extends MentorsTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(now()->startOfSecond());
    }

    private function course(string $title, bool $published = true): Course
    {
        return Course::factory()->create(['title' => $title, 'published_at' => $published ? now() : null]);
    }

    /**
     * @return array{pending: bool, courses: list<array{id: int, title: string}>}
     */
    private function pending(Course ...$courses): array
    {
        return [
            'pending' => true,
            'courses' => array_map(fn (Course $course): array => ['id' => $course->id, 'title' => $course->title], $courses),
        ];
    }

    private function done(): array
    {
        return ['pending' => false, 'courses' => []];
    }

    private function assertNothingStored(): void
    {
        $this->assertDatabaseCount('mentor_checks', 0);
        $this->assertDatabaseCount('mentor_check_courses', 0);
    }

    public function test_a_new_employee_is_pending_with_courses_published_before_signup_by_title(): void
    {
        $sql = $this->course('SQL Fundamentals');
        $git = $this->course('git Essentials');
        $python = $this->course('Python Basics');
        $this->course('Draft course', published: false);
        $this->travel(1)->seconds();
        $sam = $this->employee('Sam Lindqvist');
        $this->travel(1)->seconds();
        $this->course('Published after signup');

        $this->actingAs($sam)->getJson('/api/v1/mentor-check')
            ->assertOk()
            ->assertExactJson(['data' => $this->pending($git, $python, $sql)]);
    }

    public function test_a_course_published_in_the_same_second_as_signup_is_not_offered_or_accepted(): void
    {
        $before = $this->course('Earlier course');
        $this->travel(1)->seconds();
        $sameSecond = $this->course('Same second course');
        $sam = $this->employee('Sam Lindqvist');

        $this->actingAs($sam)->getJson('/api/v1/mentor-check')
            ->assertOk()
            ->assertExactJson(['data' => $this->pending($before)]);

        $this->postJson('/api/v1/mentor-check', ['course_ids' => [$sameSecond->id]])
            ->assertConflict()
            ->assertExactJson(['message' => "One or more of these courses can't be named.", 'code' => 'MENTORS_COURSE_NOT_ELIGIBLE']);
        $this->assertNothingStored();
    }

    public function test_with_no_courses_published_before_signup_the_check_is_pending_with_none(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $this->travel(1)->seconds();
        $this->course('Published after signup');

        $this->actingAs($sam)->getJson('/api/v1/mentor-check')
            ->assertOk()
            ->assertExactJson(['data' => $this->pending()]);
    }

    public function test_signing_up_starts_a_pending_check(): void
    {
        $python = $this->course('Python Basics');
        $this->travel(1)->seconds();

        $this->postJson('/api/v1/register', ['name' => 'Sam Lindqvist', 'email' => 'sam@example.com', 'password' => 'secret-password'])
            ->assertCreated();

        $this->getJson('/api/v1/mentor-check')->assertOk()->assertExactJson(['data' => $this->pending($python)]);
    }

    public function test_submitting_courses_stores_them_and_ends_the_check(): void
    {
        $python = $this->course('Python Basics');
        $git = $this->course('Git Essentials');
        $this->course('SQL Fundamentals');
        $this->travel(1)->seconds();
        $sam = $this->employee('Sam Lindqvist');

        $this->actingAs($sam)->postJson('/api/v1/mentor-check', ['course_ids' => [$python->id, $git->id]])
            ->assertCreated()
            ->assertExactJson(['data' => $this->done()]);

        $check = MentorCheck::query()->sole();
        $this->assertSame($sam->id, $check->user_id);
        $this->assertEqualsCanonicalizing([$python->id, $git->id], $check->courses()->pluck('course_id')->all());
        $this->getJson('/api/v1/mentor-check')->assertOk()->assertExactJson(['data' => $this->done()]);
        // No Mentor grant comes from naming a Course; that waits for a Registration decision.
        $this->assertDatabaseCount('mentor_routes', 0);
    }

    public function test_skipping_stores_a_check_with_no_courses(): void
    {
        $this->course('Python Basics');
        $this->travel(1)->seconds();
        $sam = $this->employee('Sam Lindqvist');

        $this->actingAs($sam)->postJson('/api/v1/mentor-check', ['skip' => true])
            ->assertCreated()
            ->assertExactJson(['data' => $this->done()]);

        $this->assertSame($sam->id, MentorCheck::query()->sole()->user_id);
        $this->assertDatabaseCount('mentor_check_courses', 0);
        $this->getJson('/api/v1/mentor-check')->assertOk()->assertExactJson(['data' => $this->done()]);
    }

    public function test_skipping_with_no_courses_to_name(): void
    {
        $this->actingAs($this->employee('Sam Lindqvist'))
            ->postJson('/api/v1/mentor-check', ['skip' => true])
            ->assertCreated()
            ->assertExactJson(['data' => $this->done()]);
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function firstSubmissions(): array
    {
        return ['after a submit' => ['submit'], 'after a skip' => ['skip']];
    }

    #[DataProvider('firstSubmissions')]
    public function test_a_second_submission_is_refused_and_changes_nothing(string $first): void
    {
        $python = $this->course('Python Basics');
        $git = $this->course('Git Essentials');
        $this->travel(1)->seconds();
        $sam = $this->employee('Sam Lindqvist');
        $this->actingAs($sam)
            ->postJson('/api/v1/mentor-check', $first === 'submit' ? ['course_ids' => [$python->id]] : ['skip' => true])
            ->assertCreated();
        $checks = MentorCheck::query()->get()->toArray();
        $courses = MentorCheckCourse::query()->get()->toArray();

        foreach ([['course_ids' => [$git->id]], ['skip' => true], ['course_ids' => [999999]]] as $again) {
            $this->postJson('/api/v1/mentor-check', $again)
                ->assertConflict()
                ->assertExactJson(['message' => "You've already done the Mentor check.", 'code' => 'MENTORS_CHECK_DONE']);
        }

        $this->assertSame($checks, MentorCheck::query()->get()->toArray());
        $this->assertSame($courses, MentorCheckCourse::query()->get()->toArray());
    }

    public function test_a_concurrent_duplicate_that_hits_the_unique_key_is_refused(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        // Another request commits Sam's check after this one has looked and found none.
        Event::listen('eloquent.creating: '.MentorCheck::class, function (MentorCheck $check): void {
            DB::table('mentor_checks')->insert(['user_id' => $check->user_id, 'created_at' => now(), 'updated_at' => now()]);
        });

        try {
            app(SubmitMentorCheck::class)->handle($sam->id, []);
            $this->fail('Expected the duplicate to be refused.');
        } catch (MentorRuleViolation $violation) {
            $this->assertSame('MENTORS_CHECK_DONE', $violation->errorCode->value);
        }
    }

    public function test_a_concurrent_duplicate_answers_409_over_http(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        Event::listen('eloquent.creating: '.MentorCheck::class, function (MentorCheck $check): void {
            DB::table('mentor_checks')->insert(['user_id' => $check->user_id, 'created_at' => now(), 'updated_at' => now()]);
        });

        $this->actingAs($sam)->postJson('/api/v1/mentor-check', ['skip' => true])
            ->assertConflict()
            ->assertJsonPath('code', 'MENTORS_CHECK_DONE');
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function ineligibleCourses(): array
    {
        return [
            'published after signup' => ['later'],
            'a draft' => ['draft'],
            'unknown' => ['unknown'],
        ];
    }

    #[DataProvider('ineligibleCourses')]
    public function test_an_ineligible_course_refuses_the_whole_submission(string $kind): void
    {
        $python = $this->course('Python Basics');
        $draft = $this->course('Draft course', published: false);
        $this->travel(1)->seconds();
        $sam = $this->employee('Sam Lindqvist');
        $this->travel(1)->seconds();
        $later = $this->course('Later course');
        $ineligible = match ($kind) {
            'later' => $later->id,
            'draft' => $draft->id,
            'unknown' => 999999,
        };

        $this->actingAs($sam)->postJson('/api/v1/mentor-check', ['course_ids' => [$python->id, $ineligible]])
            ->assertConflict()
            ->assertExactJson(['message' => "One or more of these courses can't be named.", 'code' => 'MENTORS_COURSE_NOT_ELIGIBLE']);

        $this->assertNothingStored();
        $this->getJson('/api/v1/mentor-check')->assertOk()->assertJsonPath('data.pending', true);
    }

    /**
     * @return array<string, array{0: array<string, mixed>, 1: list<string>}>
     */
    public static function badShapes(): array
    {
        return [
            'empty body' => [[], ['course_ids', 'skip']],
            'empty list' => [['course_ids' => []], ['course_ids', 'skip']],
            'both fields' => [['course_ids' => [1], 'skip' => true], ['course_ids', 'skip']],
            'duplicates' => [['course_ids' => [1, 1]], ['course_ids.0', 'course_ids.1']],
            'a numeric string' => [['course_ids' => ['1']], ['course_ids.0']],
            'a float' => [['course_ids' => [1.5]], ['course_ids.0']],
            'a null id' => [['course_ids' => [null]], ['course_ids.0']],
            'not a list' => [['course_ids' => ['a' => 1]], ['course_ids']],
            'not an array' => [['course_ids' => 1], ['course_ids']],
            'skip false' => [['skip' => false], ['skip']],
            'skip as a string' => [['skip' => 'true'], ['skip']],
            'skip as 1' => [['skip' => 1], ['skip']],
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @param  list<string>  $fields
     */
    #[DataProvider('badShapes')]
    public function test_a_bad_shape_is_a_422_and_stores_nothing(array $body, array $fields): void
    {
        $course = $this->course('Python Basics');
        $this->travel(1)->seconds();
        // The fixed ids above assume the first Course is id 1.
        $this->assertSame(1, $course->id);

        $this->actingAs($this->employee('Sam Lindqvist'))->postJson('/api/v1/mentor-check', $body)
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors($fields);

        $this->assertNothingStored();
    }

    public function test_guest_and_admin_have_no_access(): void
    {
        $this->getJson('/api/v1/mentor-check')->assertUnauthorized();
        $this->postJson('/api/v1/mentor-check', ['skip' => true])->assertUnauthorized();

        $this->actingAs(User::factory()->admin()->create());
        $this->getJson('/api/v1/mentor-check')->assertForbidden();
        $this->postJson('/api/v1/mentor-check', ['skip' => true])->assertForbidden();
        $this->assertNothingStored();
    }

    public function test_each_employee_has_their_own_check(): void
    {
        $python = $this->course('Python Basics');
        $this->travel(1)->seconds();
        $sam = $this->employee('Sam Lindqvist');
        $priya = $this->employee('Priya Nair');

        $this->actingAs($sam)->postJson('/api/v1/mentor-check', ['skip' => true])->assertCreated();

        $this->actingAs($priya)->getJson('/api/v1/mentor-check')->assertOk()->assertExactJson(['data' => $this->pending($python)]);
        $this->postJson('/api/v1/mentor-check', ['course_ids' => [$python->id]])->assertCreated();
        $this->assertSame(2, MentorCheck::query()->count());
    }
}
