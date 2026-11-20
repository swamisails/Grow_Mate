<?php

namespace App\Modules\Progress\Queries;

use App\Modules\Assessments\Queries\StageAvailability;
use App\Modules\Matching\Models\MatchEndReason;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Matching\Queries\CourseCompleted;
use App\Modules\Matching\Queries\RequestState;

/**
 * A Learner's Progress status on one Course (AD-4). Read-only: Progress owns no table.
 *
 * After Course Completed the status is Completed once `StageAvailability` lists Gold as passed, and
 * In progress before that, even when an earlier Match was quit (R20). Completed is derived from the
 * stored attempts, never stored. After Course Completed no new Request can be sent
 * (`CourseAlreadyCompleted`), so nothing below can outrank this.
 *
 * Otherwise the precedence is an open Request (Not yet started), then a live Match (In progress),
 * then a Quit Match (Quit), then none. Quit lasts only until a new Request is sent: it shows only
 * while the Learner's newest Request is the one whose Match was quit. A cancelled Request, or none,
 * leaves no status.
 */
class ProgressStatus
{
    public function __construct(
        private readonly RequestState $requestState,
        private readonly CourseCompleted $courseCompleted,
        private readonly StageAvailability $stageAvailability,
    ) {}

    /**
     * @return 'not_yet_started'|'in_progress'|'completed'|'quit'|null
     */
    public function handle(int $learnerId, int $courseId): ?string
    {
        if ($this->courseCompleted->handle($learnerId, $courseId)) {
            $last = collect($this->stageAvailability->handle($learnerId, $courseId))->last();

            return $last !== null && $last['level'] === 'gold' && $last['state'] === 'passed' ? 'completed' : 'in_progress';
        }

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

        // Only a cancelled newest Request, no Request, or a quit Match a newer Request has
        // superseded reaches here.
        return null;
    }
}
