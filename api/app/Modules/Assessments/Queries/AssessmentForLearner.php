<?php

namespace App\Modules\Assessments\Queries;

use App\Modules\Assessments\Exceptions\AssessmentRuleViolation;
use App\Modules\Courses\Models\StageLevel;
use App\Modules\Courses\Queries\StageForTaking;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The taking read for a Learner, only while the Stage is available to them. A draft or missing
 * Course is a 404 first, then the availability refusal.
 */
class AssessmentForLearner
{
    public function __construct(
        private readonly StageForTaking $stageForTaking,
        private readonly StageAvailability $stageAvailability,
    ) {}

    /**
     * @return array{course: array{id: int, title: string}, level: string, questions: list<array{id: int, text: string, options: list<array{id: int, text: string}>}>}
     *
     * @throws NotFoundHttpException when there is no published Course with this id
     * @throws AssessmentRuleViolation when the Learner may not take the Stage now
     */
    public function handle(int $learnerId, int $courseId, StageLevel $level): array
    {
        $taking = $this->stageForTaking->handle($courseId, $level);
        $this->stageAvailability->assertAvailable($learnerId, $courseId, $level);

        return $taking;
    }
}
