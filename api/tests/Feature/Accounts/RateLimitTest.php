<?php

namespace Tests\Feature\Accounts;

use App\Modules\Accounts\Models\User;
use Illuminate\Testing\TestResponse;

class RateLimitTest extends AccountsTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);
    }

    public function test_five_refused_sign_ins_block_the_next_even_with_the_right_password(): void
    {
        $this->failSignIns('admin@example.com', 5);

        $this->assertThrottled($this->signIn('admin@example.com', 'secret-password'));
    }

    public function test_the_email_is_matched_in_any_case(): void
    {
        $this->failSignIns('ADMIN@example.com', 5);

        $this->assertThrottled($this->signIn('admin@example.com', 'secret-password'));
    }

    public function test_successful_sign_ins_are_never_counted(): void
    {
        for ($i = 0; $i < 8; $i++) {
            $this->signIn('admin@example.com', 'secret-password')->assertOk();
        }
    }

    public function test_another_email_is_unaffected_below_the_ip_limit(): void
    {
        User::factory()->create(['email' => 'sam@example.com', 'password' => 'sam-password']);

        $this->failSignIns('admin@example.com', 5);

        $this->signIn('sam@example.com', 'sam-password')->assertOk();
    }

    public function test_twenty_refused_sign_ins_from_one_ip_block_every_email(): void
    {
        User::factory()->create(['email' => 'sam@example.com', 'password' => 'sam-password']);

        for ($i = 0; $i < 20; $i++) {
            $this->signIn("guess{$i}@example.com", 'wrong-password')->assertUnprocessable();
        }

        $this->assertThrottled($this->signIn('sam@example.com', 'sam-password'));
    }

    public function test_behind_the_web_proxy_each_browser_address_has_its_own_limit(): void
    {
        $this->fromBrowser('203.0.113.7');
        for ($i = 0; $i < 20; $i++) {
            $this->signIn("guess{$i}@example.com", 'wrong-password')->assertUnprocessable();
        }
        $this->assertThrottled($this->signIn('admin@example.com', 'secret-password'));

        $this->fromBrowser('203.0.113.8');
        $this->signIn('admin@example.com', 'secret-password')->assertOk();
    }

    public function test_a_forged_forwarded_address_does_not_escape_the_limit(): void
    {
        $this->failSignIns('admin@example.com', 5, '203.0.113.7');

        $this->withHeader('X-Forwarded-For', '198.51.100.1, 203.0.113.7');
        $this->assertThrottled($this->signIn('admin@example.com', 'secret-password'));
    }

    public function test_an_accented_variant_of_the_email_shares_its_limit(): void
    {
        $this->failSignIns('ádmin@example.com', 5);

        $this->assertThrottled($this->signIn('admin@example.com', 'secret-password'));
    }

    public function test_the_sign_in_limit_lifts_after_a_minute(): void
    {
        $this->failSignIns('admin@example.com', 5);

        $this->travel(61)->seconds();

        $this->signIn('admin@example.com', 'secret-password')->assertOk();
    }

    public function test_ten_refused_sign_ups_from_one_ip_block_the_next(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->signUp(['email' => 'admin@example.com'])->assertUnprocessable();
        }

        $this->assertThrottled($this->signUp(['email' => 'new@example.com']));
    }

    public function test_successful_sign_ups_are_never_counted(): void
    {
        for ($i = 0; $i < 12; $i++) {
            $this->signUp(['email' => "new{$i}@example.com"])->assertCreated();
            $this->app['auth']->forgetGuards();
        }
    }

    private function failSignIns(string $email, int $times, ?string $browserAddress = null): void
    {
        if ($browserAddress !== null) {
            $this->fromBrowser($browserAddress);
        }

        for ($i = 0; $i < $times; $i++) {
            $this->signIn($email, 'wrong-password')->assertUnprocessable();
        }
    }

    /**
     * Sends the next requests as the `web` proxy does: from the proxy's address, with the browser's
     * address appended to X-Forwarded-For.
     */
    private function fromBrowser(string $address): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '172.18.0.5']);
        $this->withHeader('X-Forwarded-For', $address);
    }

    /**
     * @param  array<string, string>  $overrides
     */
    private function signUp(array $overrides): TestResponse
    {
        return $this->postJson('/api/v1/register', array_merge([
            'name' => 'Priya Patel',
            'email' => 'priya@example.com',
            'password' => 'secret-password',
        ], $overrides));
    }

    private function assertThrottled(TestResponse $response): void
    {
        $response->assertTooManyRequests()
            ->assertHeader('Retry-After')
            ->assertExactJson(['message' => 'Too many attempts. Try again in a minute.']);
    }
}
