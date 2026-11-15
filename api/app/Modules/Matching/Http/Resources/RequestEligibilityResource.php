<?php

namespace App\Modules\Matching\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Whether the Learner may send a Request on this Course. This entry's check is only "no open Request".
 *
 * @property array{can_request: bool} $resource
 */
class RequestEligibilityResource extends JsonResource
{
    /** @return array{can_request: bool} */
    public function toArray(Request $request): array
    {
        return ['can_request' => $this->resource['can_request']];
    }
}
