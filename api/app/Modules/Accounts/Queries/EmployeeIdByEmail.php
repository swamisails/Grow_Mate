<?php

namespace App\Modules\Accounts\Queries;

use App\Modules\Accounts\Models\User;
use Illuminate\Support\Str;

class EmployeeIdByEmail
{
    /**
     * The id of the Employee (never the Admin) with this email, ignoring case, or null.
     */
    public function handle(string $email): ?int
    {
        $id = User::query()
            ->where('is_admin', false)
            ->whereRaw('LOWER(email) = ?', [Str::lower($email)])
            ->value('id');

        return $id === null ? null : (int) $id;
    }
}
