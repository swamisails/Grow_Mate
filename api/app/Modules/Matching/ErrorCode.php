<?php

namespace App\Modules\Matching;

/**
 * The Matching module's 409 rule-refusal codes (AD-10), each value prefixed `MATCHING_`.
 */
enum ErrorCode: string
{
    /** The Learner already has an open Request on this Course. */
    case RequestAlreadyOpen = 'MATCHING_REQUEST_ALREADY_OPEN';
}
