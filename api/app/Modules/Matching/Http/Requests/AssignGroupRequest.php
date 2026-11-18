<?php

namespace App\Modules\Matching\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * A group assignment: `{course_id: int, mentor_id: int, learner_ids: [int, …]}`, one or more
 * distinct Learners, none of them the chosen Employee. Whether those ids are Employees, and whether
 * the Course is published, is the Action's to check.
 */
class AssignGroupRequest extends FormRequest
{
    /**
     * Access is the `admin` gate on the route group (AD-9).
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
            'course_id' => ['required', 'integer:strict'],
            'mentor_id' => ['required', 'integer:strict'],
            'learner_ids' => ['required', 'array', 'list', 'min:1'],
            'learner_ids.*' => ['integer:strict', 'distinct:strict'],
        ];
    }

    /**
     * The chosen Employee can't also be one of the Learners; checked alongside the shape rules.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $mentorId = $this->input('mentor_id');
                $learnerIds = $this->input('learner_ids');
                if (is_int($mentorId) && is_array($learnerIds) && in_array($mentorId, $learnerIds, true)) {
                    $validator->errors()->add('learner_ids', "The chosen employee can't also be a learner.");
                }
            },
        ];
    }

    /**
     * The form's own words for a missing choice; a malformed body keeps the framework's.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'course_id.required' => 'Choose a course.',
            'mentor_id.required' => 'Choose an employee.',
            'learner_ids.required' => 'Choose at least one learner.',
            'learner_ids.min' => 'Choose at least one learner.',
        ];
    }

    public function courseId(): int
    {
        return (int) $this->validated('course_id');
    }

    public function mentorId(): int
    {
        return (int) $this->validated('mentor_id');
    }

    /**
     * @return list<int>
     */
    public function learnerIds(): array
    {
        /** @var list<int> */
        return $this->validated('learner_ids');
    }
}
