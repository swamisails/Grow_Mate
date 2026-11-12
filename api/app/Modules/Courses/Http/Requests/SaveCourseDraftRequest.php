<?php

namespace App\Modules\Courses\Http\Requests;

use App\Modules\Courses\ErrorCode;
use App\Modules\Courses\Exceptions\CourseRuleViolation;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\StageLevel;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The authoring rules for a draft, applied only to what is present: a Stage may have no questions
 * and no Pass mark yet (PublishEligibility keeps such a draft from being published). Every question
 * that is present needs at least 2 options with exactly 1 marked correct; every Pass mark entered is
 * a whole number 1–100.
 * Errors use Laravel's dot keys, e.g. `stages.0.questions.1.options` (AD-10).
 */
class SaveCourseDraftRequest extends FormRequest
{
    /**
     * Access is the `admin` gate on the route group (AD-9).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A published Course refuses every write (AD-14), so its 409 comes before any 422 for the body.
     * SaveCourseDraft checks again under the row lock; a missing Course stays its 404.
     *
     * @throws CourseRuleViolation
     */
    protected function prepareForValidation(): void
    {
        if (Course::query()->whereKey((int) $this->route('course'))->whereNotNull('published_at')->exists()) {
            throw new CourseRuleViolation(ErrorCode::Published);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // Strings arrive trimmed, and blank ones as null (global TrimStrings, ConvertEmptyStringsToNull).
        $rules = [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'stages' => ['required', 'array', 'list', 'size:'.count(StageLevel::cases())],
            'stages.*' => ['array'],
            'stages.*.pass_mark' => ['nullable', 'integer', 'between:1,100'],
            'stages.*.questions' => ['present', 'array', 'list'],
            'stages.*.questions.*' => ['array'],
            'stages.*.questions.*.text' => ['required', 'string', 'max:2000'],
            'stages.*.questions.*.options' => ['required', 'array', 'list', 'min:2', $this->exactlyOneCorrect(...)],
            'stages.*.questions.*.options.*' => ['array'],
            'stages.*.questions.*.options.*.text' => ['required', 'string', 'max:255'],
            'stages.*.questions.*.options.*.is_correct' => ['required', 'boolean'],
        ];

        // Bronze, Silver, Gold, in that order.
        foreach (StageLevel::cases() as $index => $level) {
            $rules["stages.{$index}.level"] = ['required', Rule::in([$level->value])];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'stages.*.pass_mark.integer' => 'The pass mark must be a whole number from 1 to 100.',
            'stages.*.pass_mark.between' => 'The pass mark must be a whole number from 1 to 100.',
            'stages.*.questions.*.options.required' => 'A question needs at least 2 options.',
            'stages.*.questions.*.options.min' => 'A question needs at least 2 options.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'stages.*.pass_mark' => 'pass mark',
            'stages.*.questions.*.text' => 'question',
            'stages.*.questions.*.options' => 'options',
            'stages.*.questions.*.options.*.text' => 'option',
            'stages.*.questions.*.options.*.is_correct' => 'correct option',
        ];
    }

    private function exactlyOneCorrect(string $attribute, mixed $value, Closure $fail): void
    {
        // Too few options is reported by `min` alone.
        if (! is_array($value) || count($value) < 2) {
            return;
        }

        $correct = collect($value)
            ->filter(fn (mixed $option) => is_array($option)
                && filter_var($option['is_correct'] ?? false, FILTER_VALIDATE_BOOLEAN))
            ->count();

        if ($correct !== 1) {
            $fail('Mark exactly one option as correct.');
        }
    }
}
