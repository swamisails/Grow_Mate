<?php

namespace App\Modules\Progress\Queries;

use App\Modules\Matching\Models\MatchEndReason;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Matching\Queries\RequestState;

/**
 * A Learner's Progress status on one Course (AD-4). Read-only: Progress owns no table.
 * Precedence: an open Request (Not yet started), then a live Match (In progress), then a Quit
 * Match (Quit), then none. Quit lasts only until a new Request is sent: it shows only while the
 * Learner's newest Request is the one whose Match was quit. A cancelled Request, or none, leaves
 * no status.
 */
class ProgressStatus
{
    public function __construct(private readonly RequestState $requestState) {}

    /**
     * @return 'not_yet_started'|'in_progress'|'quit'|null
     */
    public function handle(int $learnerId, int $courseId): ?string
    {
        $state = $this->requestState->handle($learnerId, $courseId);

        if ($state === 'pending' || $state === 'reminded') {
            return 'not_yet_started';
        }

        $matches = MentorMatch::query()
            ->join('requests', 'requests.id', '=', 'matches.request_id')
            ->where('requests.learner_id', $learnerId)
            ->where('requests.course_id', $courseId);

        if ((clone $matches)->whereNull('matches.ended_at')->exists()) {
            return 'in_progress';
        }

        $newestRequestId = Request::query()
            ->where('learner_id', $learnerId)
            ->where('course_id', $courseId)
            ->max('id');

        if ($newestRequestId !== null && (clone $matches)
            ->where('matches.request_id', $newestRequestId)
            ->where('matches.end_reason', MatchEndReason::Quit->value)
            ->exists()) {
            return 'quit';
        }

        // An accepted Request that was not quit (a Match that ended for another reason) stays In
        // progress. A quit Match that a newer Request has superseded leaves no status of its own.
        $quitAny = (clone $matches)->where('matches.end_reason', MatchEndReason::Quit->value)->exists();

        return $state === 'accepted' && ! $quitAny ? 'in_progress' : null;
    }
}
