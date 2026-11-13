<?php

namespace App\Modules\Accounts\Queries;

use App\Modules\Accounts\Models\User;

class UserNames
{
    /**
     * The name of each user id that exists, keyed by id. Ids with no user are left out.
     *
     * @param  list<int>  $userIds
     * @return array<int, string>
     */
    public function handle(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        /** @var array<int, string> */
        return User::query()->whereIn('id', $userIds)->pluck('name', 'id')->all();
    }
}
