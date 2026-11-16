<?php

namespace Tests\Feature\Accounts;

use Illuminate\Testing\TestResponse;
use Tests\Feature\ApiTestCase;

abstract class AccountsTestCase extends ApiTestCase
{
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
