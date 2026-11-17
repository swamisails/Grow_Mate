<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Http\Resources\HomeResource;
use App\Modules\Matching\Queries\HomeLists;
use Illuminate\Http\Request;

class HomeController
{
    public function __invoke(Request $request, HomeLists $homeLists): HomeResource
    {
        $userId = (int) $request->user()?->getAuthIdentifier();

        return new HomeResource($homeLists->handle($userId));
    }
}
