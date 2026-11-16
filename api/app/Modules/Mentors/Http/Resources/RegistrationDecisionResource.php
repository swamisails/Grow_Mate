<?php

namespace App\Modules\Mentors\Http\Resources;

use App\Modules\Mentors\Models\Outcome;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A Registration decision just made (R3), on the `mentor_check_courses` row it decided. Never
 * includes a route (AD-8).
 *
 * @property array{id: int, outcome: Outcome} $resource
 */
class RegistrationDecisionResource extends JsonResource
{
    /** @return array{id: int, outcome: string} */
    public function toArray(Request $request): array
    {
        return ['id' => $this->resource['id'], 'outcome' => $this->resource['outcome']->value];
    }
}
