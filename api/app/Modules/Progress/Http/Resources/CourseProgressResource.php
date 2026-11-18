<?php

namespace App\Modules\Progress\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The Learner's Progress status on a Course, or null when they have none. Not a field of the Course.
 *
 * @property 'not_yet_started'|'in_progress'|null $resource
 */
class CourseProgressResource extends JsonResource
{
    /** @return array{status: 'not_yet_started'|'in_progress'|null} */
    public function toArray(Request $request): array
    {
        return ['status' => $this->resource];
    }
}
