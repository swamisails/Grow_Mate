<?php

namespace App\Modules\Assessments\Queries;

use App\Modules\Courses\Queries\PublishedCourse;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The Stages the Learner has reached on a published Course. A draft or missing Course is a 404.
 */
class CourseStages
{
    public function __construct(
        private readonly PublishedCourse $publishedCourse,
        private readonly StageAvailability $stageAvailability,
    ) {}

    /**
     * @return list<array{level: string, state: 'available'|'locked'|'passed', locked_until?: Carbon}>
     *
     * @throws NotFoundHttpException when there is no published Course with this id
     */
    public function handle(int $learnerId, int $courseId): array
    {
        $this->publishedCourse->handle($courseId);

        return $this->stageAvailability->handle($learnerId, $courseId);
    }
}
