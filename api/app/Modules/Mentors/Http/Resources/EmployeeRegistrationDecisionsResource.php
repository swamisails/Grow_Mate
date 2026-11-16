<?php

namespace App\Modules\Mentors\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An Employee's own Registration decisions (R3): whether their Mentor check named any Course, then
 * the approved and refused Courses as separate lists. Never includes a route (AD-8).
 *
 * @property array{named: bool, approved: list<array{id: int, title: string}>, refused: list<array{id: int, title: string}>} $resource
 */
class EmployeeRegistrationDecisionsResource extends JsonResource
{
    /** @return array{named: bool, approved: list<array{id: int, title: string}>, refused: list<array{id: int, title: string}>} */
    public function toArray(Request $request): array
    {
        $courses = fn (array $list): array => array_map(
            fn (array $course): array => ['id' => $course['id'], 'title' => $course['title']],
            $list,
        );

        return [
            'named' => $this->resource['named'],
            'approved' => $courses($this->resource['approved']),
            'refused' => $courses($this->resource['refused']),
        ];
    }
}
