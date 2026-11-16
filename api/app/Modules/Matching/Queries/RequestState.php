<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Matching\Models\Request;

/**
 * A Learner's Request state on one Course, derived from `sent_at`, `accepted_at`, and `now()` (AD-4).
 * Nothing is stored. An unexpired open Request wins over an accepted one; an accepted one wins over
 * a cancelled one. Ordered by id, never by timestamp.
 */
class RequestState
{
    public const REMIND_HOURS = 72;

    public const CANCEL_HOURS = 144;

    /**
     * @return 'pending'|'reminded'|'cancelled'|'accepted'|null
     */
    public function handle(int $learnerId, int $courseId): ?string
    {
        $rows = Request::query()
            ->where('learner_id', $learnerId)
            ->where('course_id', $courseId)
            ->orderBy('id')
            ->get(['sent_at', 'accepted_at']);

        $open = null;
        $accepted = false;
        $cancelled = false;

        foreach ($rows as $row) {
            $phase = $this->phase($row);
            if (($phase === 'pending' || $phase === 'reminded') && $open === null) {
                $open = $phase;
            } elseif ($phase === 'accepted') {
                $accepted = true;
            } elseif ($phase === 'cancelled') {
                $cancelled = true;
            }
        }

        return $open ?? ($accepted ? 'accepted' : ($cancelled ? 'cancelled' : null));
    }

    /**
     * @return 'pending'|'reminded'|'cancelled'|'accepted'
     */
    public function phase(Request $request): string
    {
        if ($request->accepted_at !== null) {
            return 'accepted';
        }

        if (now()->greaterThanOrEqualTo($request->sent_at->copy()->addHours(self::CANCEL_HOURS))) {
            return 'cancelled';
        }

        if (now()->greaterThanOrEqualTo($request->sent_at->copy()->addHours(self::REMIND_HOURS))) {
            return 'reminded';
        }

        return 'pending';
    }

    /**
     * The day-3 instant was reached while the Request was still open, or Accept happened then or later.
     */
    public function reminderReached(Request $request): bool
    {
        $remindAt = $request->sent_at->copy()->addHours(self::REMIND_HOURS);

        if ($request->accepted_at === null) {
            return now()->greaterThanOrEqualTo($remindAt);
        }

        return $request->accepted_at->greaterThanOrEqualTo($remindAt);
    }

    public function isCancelled(Request $request): bool
    {
        return $this->phase($request) === 'cancelled';
    }
}
