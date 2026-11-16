<?php

namespace App\Modules\Accounts\Queries;

use App\Modules\Accounts\Models\User;

class EmployeeNotifiable
{
    /**
     * The Employee as a notifiable, for the Notifications module to send through Laravel's database
     * channel without importing the User model (AD-3). Null for Admin (never a recipient, AD-11) and
     * for an id with no user.
     */
    public function handle(int $userId): ?object
    {
        return User::query()->whereKey($userId)->where('is_admin', false)->first();
    }
}
