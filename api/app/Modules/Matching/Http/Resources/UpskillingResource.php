<?php

namespace App\Modules\Matching\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One Upskilling row: name, Course title and status only (C4, C6).
 *
 * @property array{person_name: string, course_title: string, status: 'in_progress'} $resource
 */
class UpskillingResource extends JsonResource
{
    /** @return array{person_name: string, course_title: string, status: 'in_progress'} */
    public function toArray(Request $request): array
    {
        return [
            'person_name' => $this->resource['person_name'],
            'course_title' => $this->resource['course_title'],
            'status' => $this->resource['status'],
        ];
    }
}
