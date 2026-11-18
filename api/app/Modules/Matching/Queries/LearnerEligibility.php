<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Matching\ErrorCode;
use App\Modules\Matching\Models\MatchEndReason;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Queries\IsCourseMentor;

/**
 * The only eligibility check this entry owns: an open Request already exists for the Learner and
 * Course. Open is `accepted_at` null and still before `sent_at` + 144 hours (AD-4). A cancelled
 * row does not block a new Request. Later entries add the rest of the check.
 */
class LearnerEligibility
{
    public function __construct(private readonly IsCourseMentor $isCourseMentor) {}

    /**
     * True when the Learner may send. Pass `$lock` inside the send transaction so a concurrent
     * send waits on the open Request rows.
     */
    public function allows(int $learnerId, int $courseId, bool $lock = false): bool
    {
        return $this->refusal($learnerId, $courseId, $lock) === null;
    }

    /**
     * The first refusal, or null when the Learner may send. Pass `$lock` inside the send
     * transaction so a concurrent send waits on the open Request rows.
     */
    public function refusal(int $learnerId, int $courseId, bool $lock = false): ?ErrorCode
    {
        if ($this->hasOpenRequest($learnerId, $courseId, $lock)) {
            return ErrorCode::RequestAlreadyOpen;
        }

        if ($this->hasMatch($learnerId, $courseId, live: true)) {
            return ErrorCode::MatchLive;
        }

        if ($this->hasMatch($learnerId, $courseId, live: false)) {
            return ErrorCode::CourseAlreadyCompleted;
        }

        if ($this->isCourseMentor->handle($courseId, $learnerId)) {
            return ErrorCode::AlreadyMentor;
        }

        return null;
    }

    /**
     * An open Request is `accepted_at` null and still before `sent_at` + 144 hours (AD-4).
     */
    private function hasOpenRequest(int $learnerId, int $courseId, bool $lock): bool
    {
        $query = Request::query()
            ->where('learner_id', $learnerId)
            ->where('course_id', $courseId)
            ->whereNull('accepted_at')
            ->where('sent_at', '>', now()->copy()->subHours(RequestState::CANCEL_HOURS));

        // `exists()` wraps the select, and MySQL rejects FOR UPDATE in that subquery.
        if ($lock) {
            return $query->lockForUpdate()->first(['id']) === null;
        }

        return $query->where('matches.end_reason', MatchEndReason::CourseCompleted->value)->exists();
    }
}
