<?php

namespace App\Modules\Matching\Http\Resources;

use App\Modules\Matching\Models\MentorMatch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The Match Accept just created. Never includes a Mentor route or a group id (AD-8).
 *
 * @mixin MentorMatch
 */
class MentorMatchResource extends JsonResource
{
    /** @return array{id: int, request_id: int, started_at: string} */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'request_id' => $this->request_id,
            'started_at' => $this->started_at->utc()->toJSON(),
        ];
    }
}
