<?php

namespace App\Modules\Courses;

/**
 * The Courses module's 409 rule-refusal codes (AD-10), each value prefixed `COURSES_`.
 */
enum ErrorCode: string
{
    /** Publish was asked for a Course whose saved content is not complete (PublishEligibility). */
    case Incomplete = 'COURSES_INCOMPLETE';

    /** The Course is published, so it is frozen: no Save and no second Publish (AD-14). */
    case Published = 'COURSES_PUBLISHED';
}
