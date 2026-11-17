<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Http\Resources\PartyMatchResource;
use App\Modules\Matching\Queries\PartyMatch;
use Illuminate\Http\Request;

class ShowMatchController
{
    /**
     * The route id is `{match}`. The HTTP request is `$http` so Laravel does not inject the id into it.
     */
    public function __invoke(int $match, Request $http, PartyMatch $partyMatch): PartyMatchResource
    {
        $viewerId = (int) $http->user()?->getAuthIdentifier();

        return new PartyMatchResource($partyMatch->handle($match, $viewerId));
    }
}
