<?php

namespace App\Modules\Accounts\Queries;

use App\Modules\Accounts\Models\User;
use Illuminate\Support\Str;

class EmailIsTaken
{
    /**
     * Whether any user has this email, ignoring case. Emails are stored lowercased, but older rows
     * (the seeded Admin, taken from .env as typed) may not be.
     */
    public function handle(string $email): bool
    {
        return User::query()
            ->whereRaw('LOWER(email) = ?', [Str::lower($email)])
            ->exists();
    }
}
