<?php

namespace Tests\Feature\Accounts;

use App\Modules\Accounts\Models\User;
use Illuminate\Support\Facades\Hash;

class AccountsSeederTest extends AccountsTestCase
{
    public function test_seeding_twice_leaves_exactly_one_admin(): void
    {
        config(['accounts.admin' => [
            'name' => 'Ada Admin',
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]]);

        $this->seed();
        $this->seed();

        $this->assertSame(1, User::query()->count());

        $admin = User::query()->sole();
        $this->assertTrue($admin->is_admin);
        $this->assertSame('Ada Admin', $admin->name);
        $this->assertSame('admin@example.com', $admin->email);
        $this->assertTrue(Hash::check('secret-password', $admin->password));
    }

    public function test_reseeding_with_a_changed_email_keeps_exactly_one_admin(): void
    {
        config(['accounts.admin' => [
            'name' => 'Ada Admin',
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]]);
        $this->seed();

        config(['accounts.admin.email' => 'new-admin@example.com']);
        $this->seed();

        $admin = User::query()->sole();
        $this->assertTrue($admin->is_admin);
        $this->assertSame('new-admin@example.com', $admin->email);
    }
}
