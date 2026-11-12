<?php

namespace Tests\Feature\Courses;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use Illuminate\Support\Facades\Gate;

class PublishedCoursesTest extends CoursesTestCase
{
    public function test_employees_see_only_published_course_identity_and_description(): void
    {
        config(['app.debug' => false]);
        $draft = Course::factory()->create();
        $published = Course::factory()->create(['published_at' => now()]);
        $this->signedInEmployee();
        $expected = ['id' => $published->id, 'title' => $published->title, 'description' => $published->description];

        $this->getJson('/api/v1/courses')->assertOk()->assertExactJson(['data' => [$expected]]);
        $this->getJson("/api/v1/courses/{$published->id}")->assertOk()->assertExactJson(['data' => $expected]);
        $hidden = $this->getJson("/api/v1/courses/{$draft->id}")->assertNotFound();
        $unknown = $this->getJson('/api/v1/courses/999999')->assertNotFound();
        $this->assertSame($hidden->json(), $unknown->json());
        $this->getJson('/api/v1/courses/abc')->assertNotFound();
    }

    public function test_empty_list_is_an_empty_resource_collection(): void
    {
        Course::factory()->create();
        $this->signedInEmployee()->getJson('/api/v1/courses')->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_guest_and_admin_cannot_browse_employee_courses(): void
    {
        $this->getJson('/api/v1/courses')->assertUnauthorized();
        $this->getJson('/api/v1/courses/999999')->assertUnauthorized();
        $this->signedInAdmin()->getJson('/api/v1/courses')->assertForbidden();
        $this->getJson('/api/v1/courses/999999')->assertForbidden();
    }

    public function test_role_policies_allow_only_the_intended_roles(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $this->assertTrue(Gate::forUser($admin)->allows('publish', Course::class));
        $this->assertFalse(Gate::forUser($employee)->allows('publish', Course::class));
        $this->assertFalse(Gate::forUser($admin)->allows('browse', Course::class));
        $this->assertTrue(Gate::forUser($employee)->allows('browse', Course::class));
    }
}
