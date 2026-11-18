<?php

namespace App\Modules\Matching;

/**
 * The Matching module's 409 rule-refusal codes (AD-10), each value prefixed `MATCHING_`.
 */
enum ErrorCode: string
{
    /** The Learner already has an open Request on this Course. */
    case RequestAlreadyOpen = 'MATCHING_REQUEST_ALREADY_OPEN';

    /** The Learner already has a live Match on this Course. */
    case MatchLive = 'MATCHING_MATCH_LIVE';

    /** Course Completed was already clicked for this Learner on this Course. */
    case CourseAlreadyCompleted = 'MATCHING_COURSE_ALREADY_COMPLETED';

    /** The Learner is already a Mentor of this Course. */
    case AlreadyMentor = 'MATCHING_ALREADY_MENTOR';

    /** Admin assigned a group on a draft Course. */
    case CourseNotPublished = 'MATCHING_COURSE_NOT_PUBLISHED';
}
