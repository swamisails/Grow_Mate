<?php

namespace App\Modules\Accounts\Queries;

use App\Modules\Accounts\Models\User;

/**
 * Every Employee by name, for Admin's pickers. Admin is never listed. Carries no email or role.
 */
class Employees
{
    /**
     * @return list<array{id: int, name: string}>
     */
    public function handle(): array
    {
        return User::query()
            ->where('is_admin', false)
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name'])
            ->map(fn (User $user): array => ['id' => (int) $user->id, 'name' => (string) $user->name])
            ->values()
            ->all();
    }
}
