<?php

namespace App\Modules\Mentors\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A Mentor check submission: `{course_ids: [int, …]}` (one or more, distinct) or `{skip: true}`,
 * never both. Whether the Courses may be named is a rule (409), not the request's shape.
 */
class SubmitMentorCheckRequest extends FormRequest
{
    /**
     * Access is the `browse` policy on the route group: Employees only (AD-9).
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
            'course_ids' => ['required_without:skip', 'prohibits:skip', 'array', 'list', 'min:1'],
            'course_ids.*' => ['integer:strict', 'distinct:strict'],
            // `true` only: a strict boolean that is in [true]. Not `accepted`, which is implicit and
            // would also fail when `skip` is absent.
            'skip' => ['required_without:course_ids', 'prohibits:course_ids', 'boolean:strict', Rule::in([true])],
        ];
    }

    /**
     * The Course ids named, or an empty list for a skip.
     *
     * @return list<int>
     */
    public function courseIds(): array
    {
        /** @var list<int> */
        return $this->validated('course_ids') ?? [];
    }
}
