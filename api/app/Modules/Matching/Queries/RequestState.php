<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Matching\Models\Request;

/**
 * A Learner's Request state on one Course, derived from `accepted_at` (AD-4). An open Request
 * wins over an accepted one. Ordered by id, never by timestamp.
 */
class RequestState
{
    /**
     * @return 'open'|'accepted'|null
     */
    public function handle(int $learnerId, int $courseId): ?string
    {
        $rows = Request::query()
            ->where('learner_id', $learnerId)
            ->where('course_id', $courseId)
            ->orderBy('id')
            ->get(['accepted_at']);

        if ($rows->isEmpty()) {
            return null;
        }

        foreach ($rows as $row) {
            if ($row->accepted_at === null) {
                return 'open';
            }
        }

        return 'accepted';
    }
}
