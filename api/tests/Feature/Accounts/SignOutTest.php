<?php

namespace Tests\Feature\Accounts;

use App\Modules\Accounts\Models\User;

class SignOutTest extends AccountsTestCase
{
    public function test_sign_out_invalidates_the_session(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        $signedIn = $this->signIn('admin@example.com', 'secret-password')->assertOk();

        $this->withSessionFrom($signedIn)
            ->postJson('/api/v1/logout')
            ->assertNoContent();

        // The old session cookie no longer authenticates.
        $this->withSessionFrom($signedIn)
            ->getJson('/api/v1/me')
            ->assertUnauthorized();
    }
}
