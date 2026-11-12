<?php

namespace Tests\Feature\Courses;

use App\Modules\Courses\Models\Course;

class CoursesAccessTest extends CoursesTestCase
{
    public function test_an_employee_is_refused_on_every_admin_courses_endpoint(): void
    {
        $course = Course::factory()->create(['title' => 'Kept']);
        $employee = $this->signedInEmployee();

        $employee->getJson('/api/v1/admin/courses')->assertForbidden();
        $employee->postJson('/api/v1/admin/courses', ['title' => 'New'])->assertForbidden();
        $employee->getJson("/api/v1/admin/courses/{$course->id}")->assertForbidden();
        $employee->putJson("/api/v1/admin/courses/{$course->id}", $this->document(title: 'Changed'))->assertForbidden();

        $this->assertSame(1, Course::query()->count());
        $this->assertSame('Kept', $course->fresh()->title);
    }

    public function test_an_employee_cannot_tell_a_missing_course_from_an_existing_one(): void
    {
        $employee = $this->signedInEmployee();

        $employee->getJson('/api/v1/admin/courses/999')->assertForbidden();
        $employee->putJson('/api/v1/admin/courses/999', $this->document())->assertForbidden();
    }

    public function test_signed_out_calls_are_unauthorized(): void
    {
        $course = Course::factory()->create();

        $this->getJson('/api/v1/admin/courses')->assertUnauthorized();
        $this->postJson('/api/v1/admin/courses', ['title' => 'New'])->assertUnauthorized();
        $this->getJson("/api/v1/admin/courses/{$course->id}")->assertUnauthorized();
        $this->putJson("/api/v1/admin/courses/{$course->id}", $this->document())->assertUnauthorized();
    }
}
