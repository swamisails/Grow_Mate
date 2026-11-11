<?php

namespace Tests\Feature\Accounts;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

abstract class AccountsTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Requests come from the SPA on the shared origin (AD-1), so Sanctum treats them as stateful.
        config(['sanctum.stateful' => ['localhost']]);
        $this->withHeader('Referer', 'http://localhost/');
    }

    protected function signIn(string $email, string $password): TestResponse
    {
        return $this->postJson('/api/v1/login', ['email' => $email, 'password' => $password]);
    }

    /**
     * Replays a later browser request carrying only the session cookie from $response.
     */
    protected function withSessionFrom(TestResponse $response): static
    {
        $name = config('session.cookie');
        $cookie = $response->getCookie($name);

        $this->assertNotNull($cookie, 'Expected a session cookie.');
        $this->app['auth']->forgetGuards();

        return $this->withCookie($name, $cookie->getValue());
    }
}
