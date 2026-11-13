<?php

namespace App\Modules\Mentors\Models;

/**
 * How an Employee became a Mentor for a Course (AD-7). Stored, never returned (AD-8).
 */
enum Route: string
{
    /** Passed the Course's Gold Stage (R19). */
    case GoldPass = 'gold_pass';

    /** Admin approved the Course from the Employee's Mentor check (R3). */
    case RegistrationApproval = 'registration_approval';

    /** Accepted a Group assignment for the Course (R11). */
    case GroupAssignmentAccepted = 'group_assignment_accepted';
}
