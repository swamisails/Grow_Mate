<?php

namespace App\Modules\Mentors\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An Employee refused a Course at registration, for Group assignment's Chosen Employee list. The id
 * only: never the decision, its reason or anything else about the Employee (AD-8).
 *
 * @property int $resource
 */
class RefusedEmployeeResource extends JsonResource
{
    /** @return array{id: int} */
    public function toArray(Request $request): array
    {
        return ['id' => $this->resource];
    }
}
