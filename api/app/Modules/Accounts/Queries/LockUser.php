<?php

namespace App\Modules\Accounts\Queries;

use App\Modules\Accounts\Models\User;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Locks one user row for the caller's transaction. Matching calls this instead of reading `users`.
 */
class LockUser
{
    /**
     * @throws NotFoundHttpException when there is no user with this id
     */
    public function handle(int $userId): void
    {
        $locked = User::query()->whereKey($userId)->lockForUpdate()->first(['id']);

        if ($locked === null) {
            throw new NotFoundHttpException('Not found.');
        }
    }
}
