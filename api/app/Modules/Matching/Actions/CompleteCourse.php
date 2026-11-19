<?php

namespace App\Modules\Matching\Actions;

use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Matching\Models\MatchEndReason;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The Mentor marks the Learner ready for Bronze. The Match ends with `course_completed` and the
 * Learner gets one Bronze notice, in one transaction. A missing or ended Match, a Learner and a
 * non-party are the same 404, and none of them changes anything.
 */
class CompleteCourse
{
    public function __construct(
        private readonly CourseTitles $courseTitles,
        private readonly SendNotice $sendNotice,
    ) {}

    /**
     * @throws NotFoundHttpException when this Employee cannot complete this Match
     */
    public function handle(int $matchId, int $userId): void
    {
        DB::transaction(function () use ($matchId, $userId): void {
            $match = MentorMatch::query()->lockForUpdate()->find($matchId);
            $request = $match === null ? null : Request::query()->find($match->request_id);

            if ($match === null || $match->ended_at !== null || $request === null) {
                throw new NotFoundHttpException('Not found.');
            }

            if ($userId !== (int) $request->mentor_id) {
                throw new NotFoundHttpException('Not found.');
            }

            $match->ended_at = now();
            $match->end_reason = MatchEndReason::CourseCompleted;
            $match->save();

            $courseId = (int) $request->course_id;
            $this->sendNotice->handle((int) $request->learner_id, NoticeType::BronzeAvailable, [
                'course_title' => $this->courseTitles->handle([$courseId])[$courseId] ?? '',
            ]);
        });
    }
}
