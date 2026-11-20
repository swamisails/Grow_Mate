<?php

namespace App\Modules\Assessments\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The Assessment to take (AD-14): the Course, the level, and the questions with their options in
 * authored order, as ordered lists. Never which option is correct, nor the Pass mark.
 *
 * @property array{course: array{id: int, title: string}, level: string, questions: list<array{id: int, text: string, options: list<array{id: int, text: string}>}>} $resource
 */
class AssessmentResource extends JsonResource
{
    /**
     * @return array{course: array{id: int, title: string}, level: string, questions: list<array{id: int, text: string, options: list<array{id: int, text: string}>}>}
     */
    public function toArray(Request $request): array
    {
        return [
            'course' => ['id' => $this->resource['course']['id'], 'title' => $this->resource['course']['title']],
            'level' => $this->resource['level'],
            'questions' => array_map(fn (array $question): array => [
                'id' => $question['id'],
                'text' => $question['text'],
                'options' => array_map(fn (array $option): array => [
                    'id' => $option['id'],
                    'text' => $option['text'],
                ], $question['options']),
            ], $this->resource['questions']),
        ];
    }
}
