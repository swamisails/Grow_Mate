<?php

namespace Tests\Feature\Accounts;

use App\Modules\Accounts\Models\User;

class EmployeesTest extends AccountsTestCase
{
    public function test_admin_lists_every_employee_by_name_without_admin(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Noor Admin']);
        $sam = User::factory()->create(['name' => 'Sam Lindqvist']);
        $asha = User::factory()->create(['name' => 'Asha Rao']);
        $imani = User::factory()->create(['name' => 'Imani Okafor']);

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/employees');

        $response->assertOk()->assertExactJson(['data' => [
            ['id' => $asha->id, 'name' => 'Asha Rao'],
            ['id' => $imani->id, 'name' => 'Imani Okafor'],
            ['id' => $sam->id, 'name' => 'Sam Lindqvist'],
        ]]);
    }

    public function test_an_employee_or_a_guest_cannot_list_employees(): void
    {
        $this->getJson('/api/v1/admin/employees')->assertUnauthorized();

        $this->actingAs(User::factory()->create())->getJson('/api/v1/admin/employees')->assertForbidden();
    }
}
