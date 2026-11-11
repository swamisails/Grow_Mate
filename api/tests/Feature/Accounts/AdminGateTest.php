<?php

namespace Tests\Feature\Accounts;

use App\Modules\Accounts\Models\User;

class AdminGateTest extends AccountsTestCase
{
    public function test_a_non_admin_is_refused_on_admin_routes(): void
    {
        $employee = User::factory()->create();

        $this->actingAs($employee)
            ->getJson('/api/v1/admin/ping')
            ->assertForbidden()
            ->assertJsonStructure(['message']);
    }

    public function test_the_admin_passes_the_admin_gate(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/ping')
            ->assertOk()
            ->assertExactJson(['data' => ['ok' => true]]);
    }
}
