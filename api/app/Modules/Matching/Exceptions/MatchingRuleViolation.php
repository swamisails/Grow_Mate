<?php

namespace App\Modules\Matching\Exceptions;

use App\Modules\Matching\ErrorCode;
use Illuminate\Contracts\Debug\ShouldntReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * A Matching rule refusal: rendered as a 409 with the module's error code (AD-10), and with the
 * fields it marks when there are any. An expected outcome, so it is never reported to the log.
 */
class MatchingRuleViolation extends RuntimeException implements ShouldntReport
{
    /**
     * @param  array<string, list<string>>  $errors  the marked fields, in the 422's `errors` shape
     */
    public function __construct(public readonly ErrorCode $errorCode, public readonly array $errors = [])
    {
        parent::__construct(match ($errorCode) {
            ErrorCode::RequestAlreadyOpen => 'You already have an open request for this course.',
            ErrorCode::MatchLive => 'You already have a match for this course.',
            ErrorCode::CourseAlreadyCompleted => 'Course Completed was already clicked for you on this course.',
            ErrorCode::AlreadyMentor => 'You are already a mentor for this course.',
            ErrorCode::CourseNotPublished => "This course isn't published.",
            ErrorCode::MentorNotEligible => "This employee can't be chosen for this course.",
            ErrorCode::LearnerNotAssignable => "Nothing was assigned. Some learners can't be assigned to this course.",
        });
    }

    public function render(Request $request): JsonResponse
    {
        $body = ['message' => $this->getMessage(), 'code' => $this->errorCode->value];
        if ($this->errors !== []) {
            $body['errors'] = $this->errors;
        }

        return response()->json($body, 409);
    }
}
