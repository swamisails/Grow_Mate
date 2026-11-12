<?php

namespace App\Modules\Courses\Http\Resources;

use App\Modules\Courses\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Course */
class PublishedCourseResource extends JsonResource
{
    /** @return array{id: int, title: string, description: string|null} */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'title' => $this->title, 'description' => $this->description];
    }
}
