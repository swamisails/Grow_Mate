<?php

namespace App\Modules\Accounts;

use App\Modules\Accounts\Policies\AdminPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AccountsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // AD-9: the one `admin` gate in front of every /api/v1/admin/* route.
        Gate::define('admin', [AdminPolicy::class, 'admin']);
    }
}
