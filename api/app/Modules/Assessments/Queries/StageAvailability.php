<?php

namespace App\Modules\Assessments\Queries;

use App\Modules\Assessments\ErrorCode;
use App\Modules\Assessments\Exceptions\AssessmentRuleViolation;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Courses\Models\StageLevel;
use App\Modules\Courses\Queries\CourseStageIds;
use App\Modules\Matching\Queries\CourseCompleted;

/**
 * The only computation of Stage availability (AD-4). It lists the Stages the Learner has reached,
 * in order, each `available` or `passed`; a Stage not reached is not listed. Before Course
 * Completed nothing is reached. After it, Bronze is. Silver, Gold and the Lock come in later entries.
 */
class StageAvailability
{
    public function __construct(
        private readonly CourseCompleted $courseCompleted,
        private readonly CourseStageIds $courseStageIds,
    ) {}

    /**
     * @return list<array{level: string, state: 'available'|'passed'}>
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

        $passed = StageAttempt::query()
            ->where('learner_id', $learnerId)
            ->where('course_id', $courseId)
            ->where('stage_id', $bronzeId)
            ->where('passed', true)
            ->exists();

        return [['level' => StageLevel::Bronze->value, 'state' => $passed ? 'passed' : 'available']];
    }

    /**
     * Refuses unless the Learner may take this Stage now.
     *
     * @throws AssessmentRuleViolation `ASSESSMENTS_STAGE_UNAVAILABLE` when it isn't reached,
     *                                 `ASSESSMENTS_STAGE_ALREADY_PASSED` when it is passed
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
    }
}
