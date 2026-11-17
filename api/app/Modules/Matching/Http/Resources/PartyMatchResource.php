<?php

namespace App\Modules\Matching\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The Match screen for one party: the other person's name, the Course, and the Learner's bar.
 * Never includes a Mentor route or a group id (AD-8).
 *
 * @property array{person_name: string, course_title: string, status: 'not_yet_started'|'in_progress'|null} $resource
 */
class PartyMatchResource extends JsonResource
{
    /** @return array{person_name: string, course_title: string, status: 'not_yet_started'|'in_progress'|null} */
    public function toArray(Request $request): array
    {
        return [
            'person_name' => $this->resource['person_name'],
            'course_title' => $this->resource['course_title'],
            'status' => $this->resource['status'],
        ];
    }
}
