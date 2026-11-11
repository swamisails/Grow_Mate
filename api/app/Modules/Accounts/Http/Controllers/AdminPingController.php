<?php

namespace App\Modules\Accounts\Http\Controllers;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Exercises the `admin` gate only; real admin endpoints arrive with later stories.
 */
class AdminPingController
{
    public function __invoke(): JsonResource
    {
        return new JsonResource(['ok' => true]);
    }
}
