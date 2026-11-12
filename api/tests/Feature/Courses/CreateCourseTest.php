<?php

namespace Tests\Feature\Courses;

use App\Modules\Courses\Models\Course;

class CreateCourseTest extends CoursesTestCase
{
    public function test_admin_creates_a_draft_course_with_three_empty_stages(): void
    {
        $response = $this->signedInAdmin()->postJson('/api/v1/admin/courses', [
            'title' => 'SQL Fundamentals',
            'description' => 'Queries and joins.',
        ]);

        $course = Course::query()->sole();

        $response->assertCreated()
            ->assertJsonPath('data.id', $course->id)
            ->assertJsonPath('data.title', 'SQL Fundamentals')
            ->assertJsonPath('data.description', 'Queries and joins.')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.stages.*.level', ['bronze', 'silver', 'gold'])
            ->assertJsonPath('data.stages.*.pass_mark', [null, null, null])
            ->assertJsonPath('data.stages.*.questions', [[], [], []]);

        // AD-4: no status column; a draft simply has no published_at.
        $this->assertNull($course->published_at);
    }

    public function test_the_description_may_be_left_blank(): void
    {
        $this->signedInAdmin()
            ->postJson('/api/v1/admin/courses', ['title' => 'SQL Fundamentals', 'description' => ''])
            ->assertCreated()
            ->assertJsonPath('data.description', null);
    }

    public function test_a_blank_title_is_refused_under_title(): void
    {
        $this->signedInAdmin()
            ->postJson('/api/v1/admin/courses', ['title' => '   ', 'description' => 'Queries and joins.'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title'])
            ->assertOnlyJsonValidationErrors(['title']);

        $this->assertSame(0, Course::query()->count());
    }
}
