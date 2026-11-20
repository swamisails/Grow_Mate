<?php

namespace App\Modules\Assessments;

/**
 * The Assessments module's 409 rule-refusal codes (AD-10), each value prefixed `ASSESSMENTS_`.
 */
enum ErrorCode: string
{
    /** The Learner hasn't reached this Stage: Course Completed wasn't clicked, or it is a later Stage. */
    case StageUnavailable = 'ASSESSMENTS_STAGE_UNAVAILABLE';

    /** The Learner already passed this Stage. */
    case StageAlreadyPassed = 'ASSESSMENTS_STAGE_ALREADY_PASSED';
}
