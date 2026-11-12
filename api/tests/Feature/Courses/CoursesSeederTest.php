<?php

namespace Tests\Feature\Courses;

use App\Modules\Courses\Database\Seeders\CoursesSeeder;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Queries\PublishEligibility;
use Database\Seeders\DatabaseSeeder;
use PHPUnit\Framework\Attributes\DataProvider;

class CoursesSeederTest extends CoursesTestCase
{
    /**
     * @return list<array{0: string}>
     */
    public static function demoEnvironments(): array
    {
        return [['local'], ['e2e']];
    }

    #[DataProvider('demoEnvironments')]
    public function test_demo_courses_are_complete_published_and_idempotent(string $environment): void
    {
        $this->app->instance('env', $environment);
        config(['accounts.admin' => ['name' => 'Noor', 'email' => 'noor@example.com', 'password' => 'password']]);
        $this->seed(DatabaseSeeder::class);
        $before = Course::with('stages.questions.options')->get()->toArray();
        $this->seed(DatabaseSeeder::class);
        $this->assertSame($before, Course::with('stages.questions.options')->get()->toArray());
        $this->assertDatabaseHas('users', ['email' => 'noor@example.com', 'is_admin' => true]);
        $this->assertDatabaseHas('courses', ['title' => 'Python Basics']);
        foreach (Course::with('stages.questions.options')->get() as $course) {
            $this->assertNotNull($course->published_at);
            $course->published_at = null;
            $this->assertTrue(app(PublishEligibility::class)->handle($course));
        }
    }

    public function test_production_has_no_demo_courses(): void
    {
        $this->app->instance('env', 'production');
        $this->seed(CoursesSeeder::class);
        $this->assertDatabaseCount('courses', 0);
    }
}
