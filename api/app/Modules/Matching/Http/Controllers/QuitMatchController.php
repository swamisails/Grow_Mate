<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Actions\QuitMatch;
use App\Modules\Matching\Http\Requests\QuitMatchRequest;
use Illuminate\Http\Response;

class QuitMatchController
{
    /**
     * The route id is `{match}`. The HTTP request is `$http` so Laravel does not inject the id into it.
     */
    public function __invoke(int $match, QuitMatchRequest $http, QuitMatch $quitMatch): Response
    {
        $quitMatch->handle($match, (int) $http->user()?->getAuthIdentifier(), $http->reason());

        return response()->noContent();
    }
}
