<?php

namespace App\Modules\Matching\Actions;

use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Matching\Queries\RequestState;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Accepts one ungrouped Request addressed to the caller, and creates its Match. A group, a
 * stranger, a Request already accepted, and one at or after `sent_at` + 144 hours are the same
 * 404, and none of them gains a Match. Once the Match commits, the Learner gets one notice.
 */
class AcceptRequest
{
    public function __construct(
        private readonly RequestState $requestState,
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
        private readonly SendNotice $sendNotice,
    ) {}

    /**
     * @throws NotFoundHttpException when this Employee cannot Accept this Request
     */
    public function handle(int $requestId, int $mentorId): MentorMatch
    {
        return DB::transaction(function () use ($requestId, $mentorId): MentorMatch {
            $request = Request::query()->lockForUpdate()->find($requestId);

            if (
                $request === null
                || $request->mentor_id !== $mentorId
                || $request->group_assignment_id !== null
                || $request->accepted_at !== null
                || $this->requestState->isCancelled($request)
            ) {
                throw new NotFoundHttpException('Not found.');
            }

            $request->accepted_at = now();
            $request->save();

            $match = MentorMatch::query()->create([
                'request_id' => $request->id,
                'started_at' => now(),
            ]);

            // Stored only after this transaction commits (AD-11). The Mentor's account name and
            // the Course title, and nothing else: no route (AD-8). A throw above stores nothing.
            $this->sendNotice->handle($request->learner_id, NoticeType::RequestAccepted, [
                'person_name' => $this->userNames->handle([$mentorId])[$mentorId] ?? '',
                'course_title' => $this->courseTitles->handle([$request->course_id])[$request->course_id] ?? '',
            ]);

            return $match;
        });
    }
}
