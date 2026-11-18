<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Matching\ErrorCode;
use App\Modules\Matching\Models\MatchEndReason;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Queries\IsCourseMentor;

/**
 * The only eligibility check for a Learner sending a Request (R7). The first hit is the only
 * refusal: an unexpired open Request, then a live Match, then Course Completed, then the Learner
 * already mentoring the Course. A cancelled Request, and an ended Match that is not Course
 * Completed, do not block.
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
            return $query->lockForUpdate()->first(['id']) !== null;
        }

        return $query->exists();
    }

    /**
     * A live Match has no end. Course Completed is a Match whose end reason is `course_completed`.
     */
    private function hasMatch(int $learnerId, int $courseId, bool $live): bool
    {
        $query = MentorMatch::query()
            ->join('requests', 'requests.id', '=', 'matches.request_id')
            ->where('requests.learner_id', $learnerId)
            ->where('requests.course_id', $courseId);

        if ($live) {
            return $query->whereNull('matches.ended_at')->exists();
        }

        return $query->where('matches.end_reason', MatchEndReason::CourseCompleted->value)->exists();
    }
}
