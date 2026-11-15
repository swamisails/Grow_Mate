<?php

namespace App\Modules\Matching\Http\Resources;

use App\Modules\Matching\Models\Request as CourseRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The Request just sent. Never includes `group_assignment_id` or a Mentor route (AD-8).
 *
 * @mixin CourseRequest
 */
class SentRequestResource extends JsonResource
{
    /** @return array{id: int, course_id: int, mentor_id: int, sent_at: string} */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'mentor_id' => $this->mentor_id,
            'sent_at' => $this->sent_at->utc()->toJSON(),
        ];
    }
}
