<?php

namespace App\Modules\Assessments\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * One attempt: `{answers: [{question_id: int, option_id: int}, …]}`, an ordered list with each
 * question at most once. Whether the ids fit the Stage is the Action's to check.
 */
class SubmitAttemptRequest extends FormRequest
{
    /**
     * Access is the `can:employee` group; whether the Stage is open is a 409 from the Action.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'answers' => ['present', 'array', 'list'],
            'answers.*' => ['required', 'array:question_id,option_id'],
            'answers.*.question_id' => ['required', 'integer:strict', 'distinct:strict'],
            'answers.*.option_id' => ['required', 'integer:strict'],
        ];
    }

    /**
     * @return list<array{question_id: int, option_id: int}>
     */
    public function answers(): array
    {
        /** @var list<array{question_id: int, option_id: int}> $answers */
        $answers = $this->validated('answers');

        return array_map(fn (array $answer): array => [
            'question_id' => (int) $answer['question_id'],
            'option_id' => (int) $answer['option_id'],
        ], $answers);
    }
}
