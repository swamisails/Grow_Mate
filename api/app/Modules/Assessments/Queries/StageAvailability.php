<?php

namespace App\Modules\Assessments\Queries;

use App\Modules\Assessments\ErrorCode;
use App\Modules\Assessments\Exceptions\AssessmentRuleViolation;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Courses\Models\StageLevel;
use App\Modules\Courses\Queries\CourseStageIds;
use App\Modules\Matching\Queries\CourseCompleted;
use Illuminate\Support\Carbon;

/**
 * The only computation of Stage availability (AD-4). It lists the Stages the Learner has reached,
 * in order, each `available`, `locked` (with `locked_until`) or `passed`; a Stage not reached is
 * not listed. Before Course Completed nothing is reached. After it, Bronze is. Silver and Gold come
 * in a later entry.
 *
 * The Retake rule is derived from the stored attempts against `now()`, never stored (AD-5): every
 * second failure in a cycle Locks the Stage until that failure's `submitted_at` plus one month
 * (no overflow), and the cycle starts again after it. Attempts carry no Match, so a Quit or a new
 * Match changes nothing.
 */
class StageAvailability
{
    public function __construct(
        private readonly CourseCompleted $courseCompleted,
        private readonly CourseStageIds $courseStageIds,
    ) {}

    /**
     * @return list<array{level: string, state: 'available'|'locked'|'passed', locked_until?: Carbon}>
     */
    public function handle(int $learnerId, int $courseId): array
    {
        if (! $this->courseCompleted->handle($learnerId, $courseId)) {
            return [];
        }

        $bronzeId = $this->courseStageIds->handle($courseId)[StageLevel::Bronze->value] ?? null;
        if ($bronzeId === null) {
            return [];
        }

        $attempts = StageAttempt::query()
            ->where('learner_id', $learnerId)
            ->where('course_id', $courseId)
            ->orderBy('id')
            ->get(['id', 'stage_id', 'passed', 'submitted_at'])
            ->groupBy('stage_id');

        return [['level' => StageLevel::Bronze->value] + $this->walk($attempts->get($bronzeId, collect())->all())];
    }

    /**
     * Refuses unless the Learner may take this Stage now.
     *
     * @throws AssessmentRuleViolation `ASSESSMENTS_STAGE_UNAVAILABLE` when it isn't reached,
     *                                 `ASSESSMENTS_STAGE_ALREADY_PASSED` when it is passed,
     *                                 `ASSESSMENTS_STAGE_LOCKED` while it is Locked
     */
    public function assertAvailable(int $learnerId, int $courseId, StageLevel $level): void
    {
        $entry = collect($this->handle($learnerId, $courseId))->firstWhere('level', $level->value);

        if ($entry === null) {
            throw new AssessmentRuleViolation(ErrorCode::StageUnavailable);
        }

        if ($entry['state'] === 'passed') {
            throw new AssessmentRuleViolation(ErrorCode::StageAlreadyPassed);
        }

        if ($entry['state'] === 'locked') {
            throw new AssessmentRuleViolation(ErrorCode::StageLocked);
        }
    }

    /**
     * The Retake rule over one Stage's attempts, in `id` order. A pass ends the walk as `passed`.
     * Every second failure in a cycle starts a Lock and resets the cycle. No attempt can land inside
     * a Lock (submits are refused while Locked), so the walk has no branch for one.
     *
     * @param  list<StageAttempt>  $attempts
     * @return array{state: 'available'|'locked'|'passed', locked_until?: Carbon}
     */
    private function walk(array $attempts): array
    {
        $failures = 0;
        $lockedUntil = null;

        foreach ($attempts as $attempt) {
            if ($attempt->passed) {
                return ['state' => 'passed'];
            }
            if (++$failures === 2) {
                $lockedUntil = $attempt->submitted_at->copy()->addMonthNoOverflow();
                $failures = 0;
            }
        }

        if ($lockedUntil !== null && now()->lt($lockedUntil)) {
            return ['state' => 'locked', 'locked_until' => $lockedUntil];
        }

        return ['state' => 'available'];
    }
}
