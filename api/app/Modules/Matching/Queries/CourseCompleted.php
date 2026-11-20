<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Matching\Models\MatchEndReason;
use App\Modules\Matching\Models\MentorMatch;

/**
 * Whether Course Completed was clicked for this Learner on this Course: a Match of theirs on it
 * ended with `course_completed`. A live Match, a Quit Match and no Match are all false. Other
 * modules (Assessments) ask this instead of reading Matching's tables.
 */
class CourseCompleted
{
    public function handle(int $learnerId, int $courseId): bool
    {
        return MentorMatch::query()
            ->join('requests', 'requests.id', '=', 'matches.request_id')
            ->where('requests.learner_id', $learnerId)
            ->where('requests.course_id', $courseId)
            ->where('matches.end_reason', MatchEndReason::CourseCompleted->value)
            ->exists();
    }
}
