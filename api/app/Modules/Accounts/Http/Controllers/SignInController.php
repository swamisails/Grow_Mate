<?php

namespace App\Modules\Accounts\Http\Controllers;

use App\Modules\Accounts\Actions\SignIn;
use App\Modules\Accounts\Http\Resources\UserResource;
use Illuminate\Http\Request;

class SignInController
{
    public function __invoke(Request $request, SignIn $signIn): UserResource
    {
        // Sanctum starts a session only for the SPA's own (stateful) origin (AD-1, AD-9).
        abort_unless($request->hasSession(), 403, 'Sign in from the GrowMate app.');

        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = $signIn->handle($credentials['email'], $credentials['password'], $request->session());

        return new UserResource($user);
    }
}
