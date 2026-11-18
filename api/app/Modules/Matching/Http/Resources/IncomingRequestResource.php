<?php

namespace App\Modules\Matching\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row on the Requests screen: a single pending Request, or a group assignment's pending
 * Requests as one row with the Learners' names in Request order and the group's lowest Request id.
 * The sentence is built in the SPA. Never includes `group_assignment_id`, a count or a Mentor
 * route (AD-8).
 *
 * @property array{id: int, learner_name: string, course_title: string}|array{id: int, learner_names: list<string>, course_title: string} $resource
 */
class IncomingRequestResource extends JsonResource
{
    /** @return array{id: int, learner_name: string, course_title: string}|array{id: int, learner_names: list<string>, course_title: string} */
    public function toArray(Request $request): array
    {
        if (array_key_exists('learner_names', $this->resource)) {
            return [
                'id' => $this->resource['id'],
                'learner_names' => $this->resource['learner_names'],
                'course_title' => $this->resource['course_title'],
            ];
        }

        return [
            'id' => $this->resource['id'],
            'learner_name' => $this->resource['learner_name'],
            'course_title' => $this->resource['course_title'],
        ];
    }
}
