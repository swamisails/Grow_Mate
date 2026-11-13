<?php

namespace App\Modules\Mentors\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A row of a Course's Mentors list (R6). Never includes the Mentor route (AD-8).
 *
 * @property array{id: int, name: string} $resource
 */
class CourseMentorResource extends JsonResource
{
    /** @return array{id: int, name: string} */
    public function toArray(Request $request): array
    {
        return ['id' => $this->resource['id'], 'name' => $this->resource['name']];
    }
}
