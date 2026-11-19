<?php

namespace App\Modules\Matching\Actions;

use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Matching\Models\MatchEndReason;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Either party quits a live Match. The Match ends at once, `quit_by_id` and `quit_reason` are stored
 * on it, and the other party gets one Quit notice, all in one transaction. A missing Match, an
 * ended one and a non-party are the same 404, and none of them changes anything.
 */
class QuitMatch
{
    public function __construct(
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
        private readonly SendNotice $sendNotice,
    ) {}

    /**
     * @throws NotFoundHttpException when this Employee cannot quit this Match
     */
    public function handle(int $matchId, int $userId, string $reason): void
    {
        DB::transaction(function () use ($matchId, $userId, $reason): void {
            $match = MentorMatch::query()->lockForUpdate()->find($matchId);
            $request = $match === null ? null : Request::query()->find($match->request_id);

            if ($match === null || $match->ended_at !== null || $request === null) {
                throw new NotFoundHttpException('Not found.');
            }

            $learnerId = (int) $request->learner_id;
            $mentorId = (int) $request->mentor_id;
            if ($userId !== $learnerId && $userId !== $mentorId) {
                throw new NotFoundHttpException('Not found.');
            }

            $match->ended_at = now();
            $match->end_reason = MatchEndReason::Quit;
            $match->quit_by_id = $userId;
            $match->quit_reason = $reason;
            $match->save();

            $otherId = $userId === $learnerId ? $mentorId : $learnerId;
            $courseId = (int) $request->course_id;

            // Stored only after this transaction commits (AD-11): the quitter's name, the Course
            // title and the reason, for the other party alone.
            $this->sendNotice->handle($otherId, NoticeType::MatchQuit, [
                'person_name' => $this->userNames->handle([$userId])[$userId] ?? '',
                'course_title' => $this->courseTitles->handle([$courseId])[$courseId] ?? '',
                'reason' => $reason,
            ]);
        });
    }
}
