<?php

namespace Tests\Feature\Courses;

use App\Modules\Courses\Models\Course;

class ReadCoursesTest extends CoursesTestCase
{
    public function test_admin_courses_lists_every_course_newest_first_as_draft(): void
    {
        $first = Course::factory()->create(['title' => 'Alpha']);
        $second = Course::factory()->create(['title' => 'Beta']);

        $this->signedInAdmin()
            ->getJson('/api/v1/admin/courses')
            ->assertOk()
            ->assertExactJson(['data' => [
                ['id' => $second->id, 'title' => 'Beta', 'status' => 'draft'],
                ['id' => $first->id, 'title' => 'Alpha', 'status' => 'draft'],
            ]]);
    }

    public function test_admin_courses_is_empty_when_there_are_none(): void
    {
        $this->signedInAdmin()
            ->getJson('/api/v1/admin/courses')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_the_authoring_read_includes_the_correct_option(): void
    {
        $course = Course::factory()->create();
        $this->signedInAdmin()->putJson("/api/v1/admin/courses/{$course->id}", $this->document([
            0 => ['questions' => [$this->question('Which clause filters rows?', ['ORDER BY', 'WHERE'], 1)]],
        ]))->assertOk();

        $this->getJson("/api/v1/admin/courses/{$course->id}")
            ->assertOk()
            ->assertJsonPath('data.stages.0.questions.0.options.*.is_correct', [false, true]);
    }

    public function test_an_unknown_course_is_not_found(): void
    {
        $this->signedInAdmin()
            ->getJson('/api/v1/admin/courses/999')
            ->assertNotFound()
            ->assertJsonStructure(['message']);
    }

    public function test_a_course_id_too_large_for_an_int_is_not_found(): void
    {
        $admin = $this->signedInAdmin();

        $admin->getJson('/api/v1/admin/courses/99999999999999999999')->assertNotFound();
        $admin->putJson('/api/v1/admin/courses/99999999999999999999', $this->document())->assertNotFound();
    }

    public function test_a_course_id_that_is_not_a_number_is_not_found(): void
    {
        $this->signedInAdmin()
            ->getJson('/api/v1/admin/courses/abc')
            ->assertNotFound();
    }
}
