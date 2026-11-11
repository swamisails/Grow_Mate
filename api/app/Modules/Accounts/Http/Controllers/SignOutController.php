<?php

namespace App\Modules\Accounts\Http\Controllers;

use App\Modules\Accounts\Actions\SignOut;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SignOutController
{
    public function __invoke(Request $request, SignOut $signOut): Response
    {
        $signOut->handle($request->session());

        return response()->noContent();
    }
}
