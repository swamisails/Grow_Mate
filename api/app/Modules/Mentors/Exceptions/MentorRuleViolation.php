<?php

namespace App\Modules\Mentors\Exceptions;

use App\Modules\Mentors\ErrorCode;
use Illuminate\Contracts\Debug\ShouldntReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * A Mentors rule refusal: rendered as a 409 with the module's error code (AD-10). An expected
 * outcome, so it is never reported to the log.
 */
class MentorRuleViolation extends RuntimeException implements ShouldntReport
{
    public function __construct(public readonly ErrorCode $errorCode)
    {
        parent::__construct(match ($errorCode) {
            ErrorCode::CheckDone => "You've already done the Mentor check.",
            ErrorCode::CourseNotEligible => "One or more of these courses can't be named.",
        });
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode->value], 409);
    }
}
