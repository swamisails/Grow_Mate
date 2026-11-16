<?php

namespace App\Modules\Mentors\Http\Resources;

use App\Modules\Mentors\Models\Outcome;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A row of Admin's Registration decisions list (R3): a Course named in a Mentor check, keyed by the
 * `mentor_check_courses` id, with its outcome or null while undecided. Never includes a route (AD-8).
 *
 * @property array{id: int, employee_name: string, course_title: string, outcome: Outcome|null} $resource
 */
class RegistrationDecisionRowResource extends JsonResource
{
    /** @return array{id: int, employee_name: string, course_title: string, outcome: string|null} */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['id'],
            'employee_name' => $this->resource['employee_name'],
            'course_title' => $this->resource['course_title'],
            'outcome' => $this->resource['outcome']?->value,
        ];
    }
}
