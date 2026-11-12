<?php

namespace App\Modules\Courses\Http\Resources;

use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\Option;
use App\Modules\Courses\Models\Question;
use App\Modules\Courses\Models\Stage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The authoring read of a Course (AD-14): Admin only, so it includes `is_correct`.
 * Stages come Bronze, Silver, Gold; questions and options in the order Admin authored them.
 *
 * @mixin Course
 */
class CourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status(),
            'stages' => $this->stages->map(fn (Stage $stage) => [
                'id' => $stage->id,
                'level' => $stage->level->value,
                'pass_mark' => $stage->pass_mark,
                'questions' => $stage->questions->map(fn (Question $question) => [
                    'id' => $question->id,
                    'text' => $question->text,
                    'options' => $question->options->map(fn (Option $option) => [
                        'id' => $option->id,
                        'text' => $option->text,
                        'is_correct' => $option->is_correct,
                    ])->values(),
                ])->values(),
            ])->values(),
        ];
    }
}
