<?php

namespace App\Modules\Accounts\Queries;

use App\Modules\Accounts\Models\User;

class EmployeeIds
{
    /**
     * The given ids that belong to an Employee. Admin's id and ids with no user are left out.
     *
     * @param  list<int>  $userIds
     * @return list<int>
     */
    public function handle(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        return User::query()
            ->whereIn('id', $userIds)
            ->where('is_admin', false)
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->values()
            ->all();
    }
}
