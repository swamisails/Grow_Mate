<?php

namespace App\Modules\Matching\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One pending Request on the Requests screen. The sentence is built in the SPA. Never includes
 * `group_assignment_id` or a Mentor route (AD-8).
 *
 * @property array{id: int, learner_name: string, course_title: string} $resource
 */
class IncomingRequestResource extends JsonResource
{
    /** @return array{id: int, learner_name: string, course_title: string} */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['id'],
            'learner_name' => $this->resource['learner_name'],
            'course_title' => $this->resource['course_title'],
        ];
    }
}
