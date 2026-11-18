<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Matching\Models\Request;

/**
 * The only eligibility check this entry owns: an open Request already exists for the Learner and
 * Course. Open is `accepted_at` null (AD-4). Later entries add the rest of the check.
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
            ->whereNull('accepted_at');

        if ($lock) {
            $query->lockForUpdate();
        }

        return ! $query->exists();
    }
}
