<?php

namespace App\Modules\Courses\Http\Resources;

use App\Modules\Courses\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A row of Admin Courses.
 *
 * @mixin Course
 */
class CourseListItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'status' => $this->status(),
        ];
    }
}
