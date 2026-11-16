<?php

namespace App\Modules\Accounts\Policies;

use App\Modules\Accounts\Models\User;

/**
 * The two roles (AD-9): Admin, seeded at setup, and every other user, an Employee.
 */
class RolePolicy
{
    public function admin(User $user): bool
    {
        return (bool) $user->is_admin;
    }

    public function employee(User $user): bool
    {
        return ! $user->is_admin;
    }
}
