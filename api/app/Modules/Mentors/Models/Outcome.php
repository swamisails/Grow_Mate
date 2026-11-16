<?php

namespace App\Modules\Mentors\Models;

/**
 * Admin's final Registration decision on one Mentor-check Course (R3).
 */
enum Outcome: string
{
    /** The Employee became a Mentor for the Course, by Registration approval. */
    case Approved = 'approved';

    /** The Employee was not approved for the Course; kept for Group assignment (epic 4). */
    case Refused = 'refused';
}
