<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Http\Resources\UpskillingResource;
use App\Modules\Matching\Queries\UpskillingList;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UpskillingController
{
    public function __invoke(UpskillingList $upskillingList): AnonymousResourceCollection
    {
        return UpskillingResource::collection($upskillingList->handle());
    }
}
