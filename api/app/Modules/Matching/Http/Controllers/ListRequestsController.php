<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Http\Resources\IncomingRequestResource;
use App\Modules\Matching\Queries\IncomingRequests;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ListRequestsController
{
    public function __invoke(Request $request, IncomingRequests $incomingRequests): AnonymousResourceCollection
    {
        $mentorId = (int) $request->user()?->getAuthIdentifier();

        return IncomingRequestResource::collection($incomingRequests->handle($mentorId));
    }
}
