<?php

namespace App\Modules\Matching\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A Learner's Request: `{mentor_id: int}`. Whether that person mentors the Course is a 422 from
 * the Action, not this shape check.
 */
class SendCourseRequest extends FormRequest
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
            'mentor_id' => ['required', 'integer:strict'],
        ];
    }

    public function mentorId(): int
    {
        return (int) $this->validated('mentor_id');
    }
}
