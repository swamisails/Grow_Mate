<?php

namespace App\Modules\Accounts\Actions;

use App\Modules\Accounts\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SignUp
{
    /**
     * Create an Employee and start their Sanctum SPA cookie session (AD-9). Never creates an Admin (C2).
     *
     * @throws ValidationException on `email` when the email is already taken (a concurrent sign-up).
     */
    public function handle(string $name, string $email, string $password, Session $session): User
    {
        $user = new User([
            'name' => $name,
            'email' => Str::lower($email),
            'password' => $password,
        ]);
        // `is_admin` is not fillable; set it here so a sign-up is always an Employee.
        $user->is_admin = false;

        try {
            DB::transaction(function () use ($user): void {
                $user->save();
                Auth::guard('web')->login($user);
            });
        } catch (UniqueConstraintViolationException) {
            // Another sign-up took the email between validation and insert.
            throw ValidationException::withMessages([
                'email' => [__('validation.unique', ['attribute' => 'email'])],
            ]);
        }

        $session->regenerate();

        return $user;
    }
}
