<?php

namespace App\Modules\Progress\Queries;

use App\Modules\Matching\Queries\RequestState;

/**
 * A Learner's Progress status on one Course (AD-4). Read-only: Progress owns no table.
 * A pending or reminded Request is Not yet started; an accepted one is In progress; a cancelled
 * Request, or none, leaves no status.
 */
class ProgressStatus
{
    public function __construct(private readonly RequestState $requestState) {}

    /**
     * @return 'not_yet_started'|'in_progress'|null
     */
    public function handle(int $learnerId, int $courseId): ?string
    {
        return match ($this->requestState->handle($learnerId, $courseId)) {
            'pending', 'reminded' => 'not_yet_started',
            'accepted' => 'in_progress',
            default => null,
        };
    }
}
