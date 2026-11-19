<?php

namespace App\Modules\Matching\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A party's Quit: `{reason: string}`, 1 to 500 characters after trim.
 */
class QuitMatchRequest extends FormRequest
{
    /**
     * Access is the `can:employee` group; whether the caller is a party is a 404 from the Action.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $reason = $this->input('reason');
        if (is_string($reason)) {
            $this->merge(['reason' => trim($reason)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:500'],
        ];
    }

    public function reason(): string
    {
        return (string) $this->validated('reason');
    }
}
