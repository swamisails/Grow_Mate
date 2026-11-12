<?php

namespace App\Modules\Courses\Exceptions;

use App\Modules\Courses\ErrorCode;
use Illuminate\Contracts\Debug\ShouldntReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * A Courses rule refusal: rendered as a 409 with the module's error code (AD-10). An expected
 * outcome, so it is never reported to the log.
 */
class CourseRuleViolation extends RuntimeException implements ShouldntReport
{
    public function __construct(public readonly ErrorCode $errorCode)
    {
        parent::__construct(match ($errorCode) {
            ErrorCode::Incomplete => 'Complete all three stages before publishing.',
            ErrorCode::Published => "Published courses can't be edited.",
        });
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode->value], 409);
    }
}
