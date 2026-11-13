<?php

namespace App\Modules\Mentors;

/**
 * The Mentors module's 409 rule-refusal codes (AD-10), each value prefixed `MENTORS_`.
 */
enum ErrorCode: string
{
    /** The Employee has already submitted or skipped their one Mentor check (AD-15). */
    case CheckDone = 'MENTORS_CHECK_DONE';

    /** A named Course is unknown, a draft, or was not published before the account was created (AD-15). */
    case CourseNotEligible = 'MENTORS_COURSE_NOT_ELIGIBLE';
}
