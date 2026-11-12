<?php

namespace Tests\Feature\Accounts;

use App\Modules\Accounts\Models\User;

class SignInTest extends AccountsTestCase
{
    public function test_admin_signs_in_with_the_seeded_credentials(): void
    {
        $admin = User::factory()->admin()->create([
            'name' => 'Ada Admin',
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        $response = $this->signIn('admin@example.com', 'secret-password');

        $response->assertOk()
            ->assertCookie(config('session.cookie'))
            ->assertExactJson(['data' => [
                'id' => $admin->id,
                'name' => 'Ada Admin',
                'email' => 'admin@example.com',
                'is_admin' => true,
            ]]);

        $this->withSessionFrom($response)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $admin->id);
    }

    public function test_wrong_password_is_refused_with_a_generic_message(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        $wrongPassword = $this->signIn('admin@example.com', 'not-the-password');
        $unknownEmail = $this->signIn('nobody@example.com', 'secret-password');

        $wrongPassword->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['email']])
            ->assertJsonMissingPath('errors.password');

        // No hint which field was wrong: an unknown email gets the very same body.
        $this->assertSame($wrongPassword->json(), $unknownEmail->json());
        $this->assertGuest('web');
    }

    public function test_sign_in_from_a_non_stateful_origin_is_refused(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        $this->withHeader('Referer', 'http://elsewhere.example/')
            ->signIn('admin@example.com', 'secret-password')
            ->assertForbidden()
            ->assertJsonPath('message', 'Sign in from the GrowMate app.');

        $this->assertGuest('web');
    }
}
