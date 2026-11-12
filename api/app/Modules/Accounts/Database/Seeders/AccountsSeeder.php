<?php

namespace App\Modules\Accounts\Database\Seeders;

use App\Modules\Accounts\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AccountsSeeder extends Seeder
{
    /**
     * Upsert the one Admin from ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (every environment, idempotent).
     */
    public function run(): void
    {
        $admin = config('accounts.admin');

        foreach (['name', 'email', 'password'] as $key) {
            if (blank($admin[$key] ?? null)) {
                throw new RuntimeException('ADMIN_'.strtoupper($key).' must be set to seed the Admin.');
            }
        }

        // There is one Admin (C2): update the existing one, even when ADMIN_EMAIL changed, else create it.
        $user = User::query()->where('is_admin', true)->orderBy('id')->first()
            ?? User::query()->firstOrNew(['email' => $admin['email']]);

        $user->forceFill([
            'name' => $admin['name'],
            'email' => $admin['email'],
            'is_admin' => true,
        ]);

        // Keep the existing hash when the password is unchanged, so reseeding never ends live sessions.
        if (! $user->exists || ! Hash::check($admin['password'], $user->password)) {
            $user->forceFill(['password' => $admin['password']]);
        }

        $user->save();
    }
}
