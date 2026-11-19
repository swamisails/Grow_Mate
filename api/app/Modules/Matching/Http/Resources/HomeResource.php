<?php

namespace App\Modules\Matching\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Home's Learning and Mentoring lists. Never includes a Mentor route or a group id (AD-8).
 *
 * @property array{
 *     learning: list<array{course_id: int, course_title: string, status: 'not_yet_started'|'in_progress'|'quit', match_id: int|null}>,
 *     mentoring: list<array{id: int, person_name: string, course_title: string}>
 * } $resource
 */
class HomeResource extends JsonResource
{
    /**
     * @return array{
     *     learning: list<array{course_id: int, course_title: string, status: 'not_yet_started'|'in_progress'|'quit', match_id: int|null}>,
     *     mentoring: list<array{id: int, person_name: string, course_title: string}>
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'learning' => $this->resource['learning'],
            'mentoring' => $this->resource['mentoring'],
        ];
    }
}
