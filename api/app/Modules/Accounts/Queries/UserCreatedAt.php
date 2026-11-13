<?php

namespace App\Modules\Accounts\Queries;

use App\Modules\Accounts\Models\User;
use Illuminate\Support\Carbon;

class UserCreatedAt
{
    /**
     * When the user's account was created (UTC, second precision as stored), or null when there is
     * no such user.
     */
    public function handle(int $userId): ?Carbon
    {
        /** @var User|null $user */
        $user = User::query()->whereKey($userId)->first(['id', 'created_at']);

        return $user?->created_at;
    }
}
