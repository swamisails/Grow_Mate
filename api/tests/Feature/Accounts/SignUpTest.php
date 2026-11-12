<?php

namespace Tests\Feature\Accounts;

use App\Modules\Accounts\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;

class SignUpTest extends AccountsTestCase
{
    /**
     * @param  array<string, mixed>  $overrides
     */
    private function signUp(array $overrides = []): TestResponse
    {
        return $this->postJson('/api/v1/register', array_merge([
            'name' => 'Priya Patel',
            'email' => 'priya@example.com',
            'password' => 'secret-password',
        ], $overrides));
    }

    public function test_an_employee_signs_up_and_is_signed_in(): void
    {
        $response = $this->signUp(['email' => 'Priya@Example.COM']);

        $user = User::query()->sole();
        $response->assertCreated()
            ->assertCookie(config('session.cookie'))
            ->assertExactJson(['data' => [
                'id' => $user->id,
                'name' => 'Priya Patel',
                'email' => 'priya@example.com',
                'is_admin' => false,
            ]]);

        $this->assertFalse($user->is_admin);
        $this->assertSame('priya@example.com', $user->email);
        $this->assertTrue(Hash::check('secret-password', $user->password));

        $this->withSessionFrom($response)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_a_duplicate_email_in_any_case_is_refused_on_email(): void
    {
        User::factory()->create(['email' => 'priya@example.com']);
        // The seeded Admin's email may be stored as typed in .env, mixed case included.
        User::factory()->admin()->create(['email' => 'Noor@Example.com']);

        $this->signUp(['email' => 'PRIYA@example.com'])
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'The email has already been taken.');

        $this->signUp(['email' => 'noor@example.com'])
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['email']);

        $this->assertSame(2, User::query()->count());
        $this->assertGuest('web');
    }

    public function test_blank_name_bad_email_and_short_password_are_each_refused_on_their_field(): void
    {
        $this->signUp(['name' => '', 'email' => 'not-an-email', 'password' => 'short'])
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['name', 'email', 'password']);

        $this->postJson('/api/v1/register', [])
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['name', 'email', 'password']);

        $this->assertSame(0, User::query()->count());
        $this->assertGuest('web');
    }

    public function test_an_email_that_is_not_a_string_is_refused_on_email(): void
    {
        $this->signUp(['email' => ['priya@example.com']])
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['email']);

        $this->assertSame(0, User::query()->count());
    }

    public function test_is_admin_in_the_body_is_ignored(): void
    {
        $this->signUp(['is_admin' => true])
            ->assertCreated()
            ->assertJsonPath('data.is_admin', false);

        $this->assertFalse(User::query()->sole()->is_admin);
    }

    public function test_the_new_employee_can_sign_in_afterwards(): void
    {
        $this->signUp(['email' => 'Priya@Example.com'])->assertCreated();
        $this->app['auth']->forgetGuards();

        $this->signIn('priya@example.com', 'secret-password')
            ->assertOk()
            ->assertJsonPath('data.email', 'priya@example.com')
            ->assertJsonPath('data.is_admin', false);
    }

    public function test_the_new_employee_is_refused_on_admin_routes(): void
    {
        $response = $this->signUp()->assertCreated();

        $this->withSessionFrom($response)
            ->getJson('/api/v1/admin/courses')
            ->assertForbidden();
    }

    public function test_sign_up_from_a_non_stateful_origin_is_refused(): void
    {
        $this->withHeader('Referer', 'http://elsewhere.example/')
            ->signUp()
            ->assertForbidden()
            ->assertJsonPath('message', 'Sign up from the GrowMate app.');

        $this->assertSame(0, User::query()->count());
        $this->assertGuest('web');
    }
}
