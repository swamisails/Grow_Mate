<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Matching\Models\Request;

/**
 * The only eligibility check this entry owns: an open Request already exists for the Learner and
 * Course. Open is `accepted_at` null and still before `sent_at` + 144 hours (AD-4). A cancelled
 * row does not block a new Request. Later entries add the rest of the check.
 */
class LearnerEligibility
{
    /**
     * True when the Learner may send. Pass `$lock` inside the send transaction so a concurrent
     * send waits on these rows.
     */
    public function allows(int $learnerId, int $courseId, bool $lock = false): bool
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

        return ! $query->exists();
    }
}
