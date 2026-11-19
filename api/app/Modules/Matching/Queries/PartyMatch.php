<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Progress\Queries\ProgressStatus;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * One live Match for a party. The other person's account name, the Course, and that Learner's
 * Progress status. A missing Match, or a viewer who is neither party, is the same not-found.
 */
class PartyMatch
{
    public function __construct(
        private readonly ProgressStatus $progressStatus,
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
    ) {}

    /**
     * @return array{person_name: string, course_title: string, status: 'not_yet_started'|'in_progress'|'quit'|null}
     *
     * @throws NotFoundHttpException
     */
    public function handle(int $matchId, int $viewerId): array
    {
        $match = MentorMatch::query()->whereNull('ended_at')->find($matchId);
        $request = $match === null ? null : Request::query()->find($match->request_id);
        if ($request === null) {
            throw new NotFoundHttpException('Not found.');
        }

        $learnerId = (int) $request->learner_id;
        $mentorId = (int) $request->mentor_id;
        if ($viewerId !== $learnerId && $viewerId !== $mentorId) {
            throw new NotFoundHttpException('Not found.');
        }

        $otherId = $viewerId === $learnerId ? $mentorId : $learnerId;
        $name = $this->userNames->handle([$otherId])[$otherId] ?? null;
        $courseId = (int) $request->course_id;
        $title = $this->courseTitles->handle([$courseId])[$courseId] ?? null;
        if ($name === null || $title === null) {
            throw new NotFoundHttpException('Not found.');
        }

        return [
            'person_name' => $name,
            'course_title' => $title,
            'status' => $this->progressStatus->handle($learnerId, $courseId),
        ];
    }
}
