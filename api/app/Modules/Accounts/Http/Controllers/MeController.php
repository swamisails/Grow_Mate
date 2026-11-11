<?php

namespace App\Modules\Accounts\Http\Controllers;

use App\Modules\Accounts\Http\Resources\UserResource;
use Illuminate\Http\Request;

class MeController
{
    public function __invoke(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}
