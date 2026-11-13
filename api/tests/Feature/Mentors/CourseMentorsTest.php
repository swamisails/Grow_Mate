<?php

namespace Tests\Feature\Mentors;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Models\Route;

class CourseMentorsTest extends MentorsTestCase
{
    public function test_an_employee_sees_every_mentor_by_name_then_id_without_routes(): void
    {
        $course = $this->publishedCourse();
        $other = $this->publishedCourse();
        $sam = $this->employee('Sam Lindqvist');
        $imani = $this->employee('Imani Okafor');
        $rafi = $this->employee('rafi Haddad');
        $secondImani = $this->employee('Imani Okafor');
        $elsewhere = $this->employee('Aaron Elsewhere');
        // One Mentor per route: the list looks the same whichever way they qualified.
        $this->grant($sam, $course, Route::GoldPass);
        $this->grant($secondImani, $course, Route::GroupAssignmentAccepted);
        $this->grant($rafi, $course, Route::RegistrationApproval);
        $this->grant($imani, $course, Route::GoldPass);
        $this->grant($elsewhere, $other);

        $response = $this->actingAs($this->employee('Priya Nair'))->getJson("/api/v1/courses/{$course->id}/mentors");

        $response->assertOk()->assertExactJson(['data' => [
            ['id' => $imani->id, 'name' => 'Imani Okafor'],
            ['id' => $secondImani->id, 'name' => 'Imani Okafor'],
            ['id' => $rafi->id, 'name' => 'rafi Haddad'],
            ['id' => $sam->id, 'name' => 'Sam Lindqvist'],
        ]]);
        $this->assertStringNotContainsString('route', $response->getContent());
        $this->assertStringNotContainsString('gold_pass', $response->getContent());
    }

    public function test_a_mentor_viewing_their_course_does_not_see_themselves(): void
    {
        $course = $this->publishedCourse();
        $rafi = $this->employee('Rafi Haddad');
        $imani = $this->employee('Imani Okafor');
        $this->grant($rafi, $course);
        $this->grant($imani, $course);

        $this->actingAs($rafi)->getJson("/api/v1/courses/{$course->id}/mentors")
            ->assertOk()
            ->assertExactJson(['data' => [['id' => $imani->id, 'name' => 'Imani Okafor']]]);
    }

    public function test_no_mentors_or_only_the_viewer_is_an_empty_list(): void
    {
        $course = $this->publishedCourse();
        $rafi = $this->employee('Rafi Haddad');

        $this->actingAs($rafi)->getJson("/api/v1/courses/{$course->id}/mentors")->assertOk()->assertExactJson(['data' => []]);

        $this->grant($rafi, $course);
        $this->getJson("/api/v1/courses/{$course->id}/mentors")->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_a_draft_unknown_or_nonnumeric_course_is_not_found(): void
    {
        config(['app.debug' => false]);
        $draft = Course::factory()->create();
        $this->grant($this->employee('Rafi Haddad'), $draft);
        $this->actingAs($this->employee('Priya Nair'));

        $hidden = $this->getJson("/api/v1/courses/{$draft->id}/mentors")->assertNotFound();
        $unknown = $this->getJson('/api/v1/courses/999999/mentors')->assertNotFound();
        $this->assertSame($hidden->json(), $unknown->json());
        $this->getJson('/api/v1/courses/abc/mentors')->assertNotFound();
        $this->getJson('/api/v1/courses/9999999999999999999/mentors')->assertNotFound();
    }

    public function test_guest_and_admin_have_no_access(): void
    {
        $course = $this->publishedCourse();
        $this->grant($this->employee('Rafi Haddad'), $course);

        $this->getJson("/api/v1/courses/{$course->id}/mentors")->assertUnauthorized();
        $this->actingAs(User::factory()->admin()->create())
            ->getJson("/api/v1/courses/{$course->id}/mentors")
            ->assertForbidden();
        // The role check runs before the lookup, so Admin can't tell a missing Course from a real one.
        $this->getJson('/api/v1/courses/999999/mentors')->assertForbidden();
    }
}
