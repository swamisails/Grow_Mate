<?php

namespace App\Modules\Accounts\Policies;

use App\Modules\Accounts\Models\User;

class AdminPolicy
{
    public function admin(User $user): bool
    {
        return (bool) $user->is_admin;
    }
}
