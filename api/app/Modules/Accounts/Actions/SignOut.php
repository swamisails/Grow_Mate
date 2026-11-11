<?php

namespace App\Modules\Accounts\Actions;

use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SignOut
{
    /**
     * End the current session (AD-9): sign out, invalidate the session and rotate the CSRF token.
     */
    public function handle(Session $session): void
    {
        DB::transaction(fn () => Auth::guard('web')->logout());

        $session->invalidate();
        $session->regenerateToken();
    }
}
