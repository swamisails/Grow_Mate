<?php

namespace App\Modules\Accounts\Actions;

use App\Modules\Accounts\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SignIn
{
    /**
     * Start a Sanctum SPA cookie session (AD-9) for the given credentials.
     *
     * @throws ValidationException with one generic message on `email`, never saying which field was wrong.
     */
    public function handle(string $email, string $password, Session $session): User
    {
        /** @var User $user */
        $user = DB::transaction(function () use ($email, $password): User {
            $guard = Auth::guard('web');

            if (! $guard->attempt(['email' => $email, 'password' => $password])) {
                throw ValidationException::withMessages([
                    'email' => [__('auth.failed')],
                ]);
            }

            return $guard->user();
        });

        $session->regenerate();

        return $user;
    }
}
