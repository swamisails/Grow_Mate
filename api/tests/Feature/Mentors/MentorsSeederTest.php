<?php

namespace Tests\Feature\Mentors;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Database\Seeders\MentorsSeeder;
use App\Modules\Mentors\Models\MentorCheck;
use App\Modules\Mentors\Models\MentorRoute;
use App\Modules\Mentors\Models\Route;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;

class MentorsSeederTest extends MentorsTestCase
{
    /**
     * @return list<array{0: string}>
     */
    public static function demoEnvironments(): array
    {
        return [['local'], ['e2e']];
    }

    private function seedAll(string $environment): void
    {
        $this->app->instance('env', $environment);
        config(['accounts.admin' => ['name' => 'Noor', 'email' => 'noor@example.com', 'password' => 'password']]);
        $this->seed(DatabaseSeeder::class);
    }

    #[DataProvider('demoEnvironments')]
    public function test_demo_employees_and_python_basics_mentors_are_seeded_idempotently(string $environment): void
    {
        $this->seedAll($environment);
        $users = User::query()->orderBy('id')->get()->toArray();
        $routes = MentorRoute::query()->orderBy('id')->get()->toArray();
        $checks = MentorCheck::query()->orderBy('id')->get()->toArray();
        $this->seedAll($environment);

        $this->assertSame($users, User::query()->orderBy('id')->get()->toArray());
        $this->assertSame($routes, MentorRoute::query()->orderBy('id')->get()->toArray());
        $this->assertSame($checks, MentorCheck::query()->orderBy('id')->get()->toArray());

        $employees = User::query()->where('is_admin', false)->orderBy('name')->get();
        $this->assertSame(['Imani Okafor', 'Priya Nair', 'Rafi Haddad'], $employees->pluck('name')->all());
        foreach ($employees as $employee) {
            $this->assertTrue(Hash::check(MentorsSeeder::DEMO_PASSWORD, $employee->password));
        }

        $python = Course::query()->where('title', 'Python Basics')->sole();
        $mentors = MentorRoute::query()->orderBy('id')->get();
        $this->assertCount(2, $mentors);
        $this->assertEqualsCanonicalizing(
            [$employees->firstWhere('name', 'Rafi Haddad')->id, $employees->firstWhere('name', 'Imani Okafor')->id],
            $mentors->pluck('user_id')->all(),
        );
        foreach ($mentors as $mentor) {
            $this->assertSame($python->id, $mentor->course_id);
            $this->assertSame(Route::RegistrationApproval, $mentor->route);
        }

        // Each demo Employee has skipped the Mentor check: one check, no named Courses.
        $this->assertEqualsCanonicalizing($employees->pluck('id')->all(), MentorCheck::query()->pluck('user_id')->all());
        $this->assertDatabaseCount('mentor_check_courses', 0);
    }

    public function test_seeded_demo_employees_sign_in_with_the_demo_password(): void
    {
        $this->seedAll('e2e');
        // Back to `testing`, where the CSRF check is skipped as in every other API test.
        $this->app->instance('env', 'testing');

        $this->postJson('/api/v1/login', ['email' => 'rafi.haddad@example.com', 'password' => MentorsSeeder::DEMO_PASSWORD])
            ->assertOk()
            ->assertJsonPath('data.name', 'Rafi Haddad')
            ->assertJsonPath('data.is_admin', false);

        // Straight to Home: the Mentor check is already done.
        $this->getJson('/api/v1/mentor-check')->assertOk()->assertExactJson(['data' => ['pending' => false, 'courses' => []]]);
    }

    public function test_production_has_no_demo_employees_or_grants(): void
    {
        $this->seedAll('production');

        $this->assertSame(0, User::query()->where('is_admin', false)->count());
        $this->assertDatabaseCount('mentor_routes', 0);
        $this->assertDatabaseCount('mentor_checks', 0);
    }
}
