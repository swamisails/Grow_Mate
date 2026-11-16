<?php

namespace App\Modules\Notifications\Http\Resources;

use App\Modules\Notifications\NoticeType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * One notice in the inbox (AD-11): `{id, type, occurred_at, ...type fields}`. `occurred_at` is when
 * the notice was created, in UTC with `Z`. Carries no read state and no link.
 *
 * @property array{id: string, type: NoticeType, occurred_at: Carbon, fields: array<string, mixed>} $resource
 */
class NoticeResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        // `+` keeps these three keys whatever the fields hold; NoticeType::fields() never names them.
        return [
            'id' => $this->resource['id'],
            'type' => $this->resource['type']->value,
            'occurred_at' => $this->resource['occurred_at']->toIso8601ZuluString(),
        ] + $this->resource['fields'];
    }
}
