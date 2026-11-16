<?php

namespace App\Modules\Notifications\Http\Controllers;

use App\Modules\Notifications\Http\Resources\NoticeResource;
use App\Modules\Notifications\Queries\Inbox;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NoticesController
{
    public function __invoke(Request $request, Inbox $inbox): AnonymousResourceCollection
    {
        $userId = (int) $request->user()?->getAuthIdentifier();

        return NoticeResource::collection($inbox->handle($userId));
    }
}
