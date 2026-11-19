<?php

namespace App\Modules\Matching\Models;

/**
 * Why a Match ended. A null reason, with `ended_at` null, is a live Match.
 */
enum MatchEndReason: string
{
    /** Either party quit the Match. An ended Match with this reason does not block a new Request. */
    case Quit = 'quit';

    /** Course Completed was clicked. The Learner may not request this Course again. */
    case CourseCompleted = 'course_completed';
}
