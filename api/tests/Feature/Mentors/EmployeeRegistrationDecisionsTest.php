<?php

namespace Tests\Feature\Mentors;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Actions\DecideRegistration;
use App\Modules\Mentors\Actions\SubmitMentorCheck;
use App\Modules\Mentors\Models\MentorCheck;
use App\Modules\Mentors\Models\Outcome;

class EmployeeRegistrationDecisionsTest extends MentorsTestCase
{
    /** @var array<string, Course> */
    private array $courses = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(now()->startOfSecond());
        foreach (['Python Basics', 'git Essentials', 'SQL Fundamentals', 'Docker Basics', 'Agile Ways'] as $title) {
            $this->courses[$title] = Course::factory()->create(['title' => $title, 'published_at' => now()]);
        }
        // Employees made from here on may name all of them (published before their accounts).
        $this->travel(1)->seconds();
    }

    /**
     * The Employee's Mentor check naming the Courses titled `$titles`; returns their
     * `mentor_check_courses` ids keyed by title.
     *
     * @return array<string, int>
     */
    private function check(User $employee, string ...$titles): array
    {
        app(SubmitMentorCheck::class)->handle($employee->id, array_map(fn (string $title): int => $this->courses[$title]->id, $titles));

        $ids = MentorCheck::query()->where('user_id', $employee->id)->sole()->courses()->orderBy('id')->pluck('id')->all();

        return array_combine($titles, $ids);
    }

    private function decide(int $mentorCheckCourseId, Outcome $outcome): void
    {
        app(DecideRegistration::class)->handle($mentorCheckCourseId, $outcome);
    }

    /**
     * @return array{id: int, title: string}
     */
    private function course(string $title): array
    {
        return ['id' => $this->courses[$title]->id, 'title' => $title];
    }

    public function test_lists_approved_and_refused_courses_apart_by_title_leaving_out_undecided_ones(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $priya = $this->employee('Priya Nair');
        $named = $this->check($sam, 'Python Basics', 'git Essentials', 'SQL Fundamentals', 'Docker Basics', 'Agile Ways');
        $this->decide($named['Python Basics'], Outcome::Approved);
        $this->decide($named['git Essentials'], Outcome::Approved);
        $this->decide($named['SQL Fundamentals'], Outcome::Refused);
        $this->decide($named['Docker Basics'], Outcome::Refused);
        // Another Employee's decision isn't Sam's.
        $this->decide($this->check($priya, 'Agile Ways')['Agile Ways'], Outcome::Approved);

        $response = $this->actingAs($sam)->getJson('/api/v1/registration-decisions')
            ->assertOk()
            ->assertExactJson(['data' => [
                'named' => true,
                'approved' => [$this->course('git Essentials'), $this->course('Python Basics')],
                'refused' => [$this->course('Docker Basics'), $this->course('SQL Fundamentals')],
            ]]);

        $this->assertStringNotContainsString('route', $response->getContent());
    }

    public function test_one_approved_one_refused_and_one_undecided(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $named = $this->check($sam, 'Python Basics', 'git Essentials', 'SQL Fundamentals');
        $this->decide($named['Python Basics'], Outcome::Approved);
        $this->decide($named['SQL Fundamentals'], Outcome::Refused);

        $this->actingAs($sam)->getJson('/api/v1/registration-decisions')
            ->assertOk()
            ->assertExactJson(['data' => [
                'named' => true,
                'approved' => [$this->course('Python Basics')],
                'refused' => [$this->course('SQL Fundamentals')],
            ]]);
    }

    public function test_named_courses_with_nothing_decided_give_two_empty_lists(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $this->check($sam, 'Python Basics', 'git Essentials');

        $this->actingAs($sam)->getJson('/api/v1/registration-decisions')
            ->assertOk()
            ->assertExactJson(['data' => ['named' => true, 'approved' => [], 'refused' => []]]);
    }

    public function test_a_skipped_or_pending_check_names_nothing(): void
    {
        $skipper = $this->employee('Lee Skipper');
        $this->check($skipper);
        $pending = $this->employee('Pat Pending');

        foreach ([$skipper, $pending] as $employee) {
            $this->actingAs($employee)->getJson('/api/v1/registration-decisions')
                ->assertOk()
                ->assertExactJson(['data' => ['named' => false, 'approved' => [], 'refused' => []]]);
        }
    }

    public function test_a_guest_is_unauthorized_and_admin_is_forbidden(): void
    {
        $this->getJson('/api/v1/registration-decisions')->assertUnauthorized();

        $this->actingAs(User::factory()->admin()->create())->getJson('/api/v1/registration-decisions')->assertForbidden();
    }
}
