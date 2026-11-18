<?php

namespace App\Modules\Matching\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * The group assignment Admin just created, by name. Never includes a Request, a Match, their
 * state or any id (AD-8, C4).
 *
 * @property array{course_title: string, mentor_name: string, learner_names: list<string>, created_at: Carbon} $resource
 */
class GroupAssignmentResource extends JsonResource
{
    /** @return array{course_title: string, mentor_name: string, learner_names: list<string>, created_at: string} */
    public function toArray(Request $request): array
    {
        return [
            'course_title' => $this->resource['course_title'],
            'mentor_name' => $this->resource['mentor_name'],
            'learner_names' => $this->resource['learner_names'],
            'created_at' => $this->resource['created_at']->utc()->toJSON(),
        ];
    }
}
