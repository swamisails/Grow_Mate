<?php

namespace Tests\Feature\Accounts;

class SignedOutTest extends AccountsTestCase
{
    public function test_a_protected_call_without_a_session_is_unauthorized(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);
    }
}
