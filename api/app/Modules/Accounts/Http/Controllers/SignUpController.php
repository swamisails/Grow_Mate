<?php

namespace App\Modules\Accounts\Http\Controllers;

use App\Modules\Accounts\Actions\SignUp;
use App\Modules\Accounts\Http\Resources\UserResource;
use App\Modules\Accounts\Queries\EmailIsTaken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class SignUpController
{
    /**
     * Answers 201 with the new Employee (a resource for a just-created model is a 201).
     */
    public function __invoke(Request $request, SignUp $signUp, EmailIsTaken $emailIsTaken): UserResource
    {
        // Sanctum starts a session only for the SPA's own (stateful) origin (AD-1, AD-9).
        abort_unless($request->hasSession(), 403, 'Sign up from the GrowMate app.');

        // Only these three fields are read; anything else in the body (e.g. `is_admin`) is ignored.
        $input = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', $this->emailIsFree($emailIsTaken)],
            'password' => ['required', 'string', Password::defaults()],
        ]);

        $user = $signUp->handle($input['name'], $input['email'], $input['password'], $request->session());

        return new UserResource($user);
    }

    /**
     * A taken email, in any case, is refused on `email`. A non-string is left to the `string` rule.
     */
    private function emailIsFree(EmailIsTaken $emailIsTaken): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($emailIsTaken): void {
            if (is_string($value) && $emailIsTaken->handle($value)) {
                $fail('validation.unique')->translate();
            }
        };
    }
}
