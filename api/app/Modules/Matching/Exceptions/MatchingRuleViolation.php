<?php

namespace App\Modules\Matching\Exceptions;

use App\Modules\Matching\ErrorCode;
use Illuminate\Contracts\Debug\ShouldntReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * A Matching rule refusal: rendered as a 409 with the module's error code (AD-10). An expected
 * outcome, so it is never reported to the log.
 */
class MatchingRuleViolation extends RuntimeException implements ShouldntReport
{
    public function __construct(public readonly ErrorCode $errorCode)
    {
        parent::__construct(match ($errorCode) {
            ErrorCode::RequestAlreadyOpen => 'You already have an open request for this course.',
            ErrorCode::MatchLive => 'You already have a match for this course.',
            ErrorCode::CourseAlreadyCompleted => 'Course Completed was already clicked for you on this course.',
            ErrorCode::AlreadyMentor => 'You are already a mentor for this course.',
            ErrorCode::CourseNotPublished => "This course isn't published.",
        });
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode->value], 409);
    }
}
