<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Actions\GrantMentor;
use App\Modules\Mentors\Models\Route;
use Illuminate\Testing\TestResponse;
use Tests\Feature\ApiTestCase;

abstract class MatchingTestCase extends ApiTestCase
{
    protected function publishedCourse(string $title = 'Python Basics'): Course
    {
        return Course::factory()->create(['title' => $title, 'published_at' => now()]);
    }

    protected function employee(string $name): User
    {
        return User::factory()->create(['name' => $name]);
    }

    protected function grant(User $user, Course $course, Route $route = Route::RegistrationApproval): void
    {
        app(GrantMentor::class)->handle($user->id, $course->id, $route);
    }

    protected function assertHidesRouteAndGroup(TestResponse $response): void
    {
        $body = $response->getContent();
        $this->assertStringNotContainsString('group_assignment_id', $body);
        $this->assertStringNotContainsString('route', $body);
        $this->assertStringNotContainsString('gold_pass', $body);
        $this->assertStringNotContainsString('registration_approval', $body);
        $this->assertStringNotContainsString('group_assignment_accepted', $body);
    }
}
