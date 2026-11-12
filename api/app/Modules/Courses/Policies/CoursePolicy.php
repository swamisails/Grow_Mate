<?php

namespace App\Modules\Courses\Policies;

use App\Modules\Accounts\Models\User;

/**
 * Role access to Courses (AD-9). Checked by route middleware before any Course is looked up, so a
 * refused role can't tell a missing Course from an existing one.
 */
class CoursePolicy
{
    /**
     * Employees browse published Courses; Admin authors them instead.
     */
    public function browse(User $user): bool
    {
        return ! $user->is_admin;
    }

    /**
     * Only Admin publishes.
     */
    public function publish(User $user): bool
    {
        return (bool) $user->is_admin;
    }
}
