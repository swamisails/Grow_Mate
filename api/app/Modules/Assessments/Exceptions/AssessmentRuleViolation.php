<?php

namespace App\Modules\Assessments\Exceptions;

use App\Modules\Assessments\ErrorCode;
use Illuminate\Contracts\Debug\ShouldntReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * An Assessments rule refusal: rendered as a 409 with the module's error code (AD-10). An expected
 * outcome, so it is never reported to the log.
 */
class AssessmentRuleViolation extends RuntimeException implements ShouldntReport
{
    public function __construct(public readonly ErrorCode $errorCode)
    {
        parent::__construct(match ($errorCode) {
            ErrorCode::StageUnavailable => "This stage isn't open to you.",
            ErrorCode::StageAlreadyPassed => 'You have already passed this stage.',
        });
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode->value], 409);
    }
}
