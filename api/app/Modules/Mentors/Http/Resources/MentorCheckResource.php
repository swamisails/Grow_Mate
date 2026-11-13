<?php

namespace App\Modules\Mentors\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An Employee's Mentor check status: whether it is still pending and, while it is, the Courses
 * they may name. Carries no route and no decision (AD-8).
 *
 * @property array{pending: bool, courses: list<array{id: int, title: string}>} $resource
 */
class MentorCheckResource extends JsonResource
{
    /** @return array{pending: bool, courses: list<array{id: int, title: string}>} */
    public function toArray(Request $request): array
    {
        return [
            'pending' => $this->resource['pending'],
            'courses' => array_map(
                fn (array $course): array => ['id' => $course['id'], 'title' => $course['title']],
                $this->resource['courses'],
            ),
        ];
    }
}
