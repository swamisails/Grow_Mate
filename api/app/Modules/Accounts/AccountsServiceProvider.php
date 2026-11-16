<?php

namespace App\Modules\Accounts;

use App\Modules\Accounts\Policies\RolePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AccountsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // AD-9: the one `admin` gate in front of every /api/v1/admin/* route.
        Gate::define('admin', [RolePolicy::class, 'admin']);
        // Its counterpart in front of the Employee routes, so no other module owns that role check (AD-3).
        Gate::define('employee', [RolePolicy::class, 'employee']);
    }
}
