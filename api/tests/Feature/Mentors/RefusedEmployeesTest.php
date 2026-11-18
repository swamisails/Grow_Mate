<?php

namespace Tests\Feature\Mentors;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Models\RegistrationDecision;

class RefusedEmployeesTest extends MentorsTestCase
{
    private function refuse(User $employee, Course $course): void
    {
        RegistrationDecision::factory()->refused()->create(['user_id' => $employee->id, 'course_id' => $course->id]);
    }

    public function test_admin_reads_the_ids_refused_the_course_and_nothing_else(): void
    {
        $sql = $this->publishedCourse();
        $python = $this->publishedCourse();
        $sam = $this->employee('Sam Lindqvist');
        $rafi = $this->employee('Rafi Haddad');
        $imani = $this->employee('Imani Okafor');
        $this->refuse($rafi, $sql);
        $this->refuse($sam, $sql);
        $this->refuse($imani, $python);
        RegistrationDecision::factory()->create(['user_id' => $imani->id, 'course_id' => $sql->id]);

        $response = $this->actingAs(User::factory()->admin()->create())
            ->getJson("/api/v1/admin/courses/{$sql->id}/refused-employees");

        // By id: Sam's account is older than Rafi's.
        $response->assertOk()->assertExactJson(['data' => [['id' => $sam->id], ['id' => $rafi->id]]]);
        $this->assertStringNotContainsString('refused', $response->getContent());
        $this->assertStringNotContainsString('outcome', $response->getContent());
    }

    public function test_a_course_with_no_refusals_or_an_unknown_course_is_an_empty_list(): void
    {
        $sql = $this->publishedCourse();
        $this->actingAs(User::factory()->admin()->create());

        $this->getJson("/api/v1/admin/courses/{$sql->id}/refused-employees")->assertOk()->assertExactJson(['data' => []]);
        $this->getJson('/api/v1/admin/courses/999999/refused-employees')->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_a_nonnumeric_course_is_not_found(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->getJson('/api/v1/admin/courses/abc/refused-employees')->assertNotFound();
        $this->getJson('/api/v1/admin/courses/9999999999999999999/refused-employees')->assertNotFound();
    }

    public function test_guest_and_employee_have_no_access(): void
    {
        $sql = $this->publishedCourse();
        $sam = $this->employee('Sam Lindqvist');
        $this->refuse($sam, $sql);

        $this->getJson("/api/v1/admin/courses/{$sql->id}/refused-employees")->assertUnauthorized();
        $this->actingAs($sam)->getJson("/api/v1/admin/courses/{$sql->id}/refused-employees")->assertForbidden();
    }
}
