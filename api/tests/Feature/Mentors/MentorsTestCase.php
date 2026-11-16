<?php

namespace Tests\Feature\Mentors;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Actions\GrantMentor;
use App\Modules\Mentors\Models\Route;
use Tests\Feature\ApiTestCase;

abstract class MentorsTestCase extends ApiTestCase
{
    protected function publishedCourse(): Course
    {
        return Course::factory()->create(['published_at' => now()]);
    }

    protected function employee(string $name): User
    {
        return User::factory()->create(['name' => $name]);
    }

    protected function grant(User $user, Course $course, Route $route = Route::RegistrationApproval): void
    {
        app(GrantMentor::class)->handle($user->id, $course->id, $route);
    }
}
