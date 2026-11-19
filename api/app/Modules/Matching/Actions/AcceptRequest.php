<?php

namespace App\Modules\Matching\Actions;

use App\Modules\Accounts\Queries\LockUser;
use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Courses\Queries\LockCourse;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Matching\Queries\RequestState;
use App\Modules\Mentors\Actions\GrantMentor;
use App\Modules\Mentors\Models\Route;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The one Accept (AD-13). Accepts a Request addressed to the caller and creates its Match. A stranger,
 * a Request already accepted, and one at or after `sent_at` + 144 hours are the same 404, and none
 * of them gains a Match.
 *
 * Any Request id of a pending group accepts the whole group in one transaction: every pending
 * Request in it gets its own independent Match, and the chosen Employee becomes the Course's Mentor
 * with the route `group_assignment_accepted` (a first route already granted stays, AD-7). The
 * response is the posted Request's Match. Once it commits, each Learner gets one ordinary Accept
 * notice; the chosen Employee gets none. Nothing returned or sent names the group or the route (AD-8).
 */
class AcceptRequest
{
    public function __construct(
        private readonly RequestState $requestState,
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
        private readonly SendNotice $sendNotice,
        private readonly GrantMentor $grantMentor,
        private readonly LockUser $lockUser,
        private readonly LockCourse $lockCourse,
    ) {}

    /**
     * @throws NotFoundHttpException when this Employee cannot Accept this Request
     */
    public function handle(int $requestId, int $mentorId): MentorMatch
    {
        return DB::transaction(function () use ($requestId, $mentorId): MentorMatch {
            // No Action updates `group_assignment_id` or `course_id` after creation, so an unlocked
            // read can pick the branch. Were the group id nulled meanwhile, the posted Request isn't
            // in the locked group below and the guard gives 404.
            $unlocked = Request::query()->whereKey($requestId)->first(['group_assignment_id', 'course_id']);
            $groupId = $unlocked?->group_assignment_id;

            if ($groupId === null) {
                $request = Request::query()->lockForUpdate()->find($requestId);
                $this->guard($request, $mentorId);

                [$mentorName, $courseTitle] = $this->noticeFields($mentorId, (int) $request->course_id);

                return $this->accept($request, $mentorName, $courseTitle);
            }

            // The chosen Employee, then the Course, then every sibling in id order, before anything
            // is checked: user → course → requests, the order `SendRequest` and `AssignGroup` take
            // (AD-3), so `GrantMentor`'s foreign-key locks can't deadlock with either. Two Accepts
            // on one group take their locks in the same order whichever id they posted; the loser
            // waits, then finds the posted Request accepted: 404.
            $this->lockUser->handle($mentorId);
            $this->lockCourse->handle((int) $unlocked->course_id);
            $group = Request::query()
                ->where('group_assignment_id', $groupId)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $posted = $group->firstWhere('id', $requestId);
            $this->guard($posted, $mentorId);

            [$mentorName, $courseTitle] = $this->noticeFields($mentorId, (int) $posted->course_id);
            $matches = [];
            foreach ($group as $request) {
                if ($request->mentor_id !== $mentorId || $request->accepted_at !== null || $this->requestState->isCancelled($request)) {
                    continue;
                }
                $matches[$request->id] = $this->accept($request, $mentorName, $courseTitle);
            }

            $this->grantMentor->handle($mentorId, $posted->course_id, Route::GroupAssignmentAccepted);

            return $matches[$posted->id];
        });
    }

    /**
     * @throws NotFoundHttpException when the Request is missing, someone else's, accepted or cancelled
     */
    private function guard(?Request $request, int $mentorId): void
    {
        if (
            $request === null
            || $request->mentor_id !== $mentorId
            || $request->accepted_at !== null
            || $this->requestState->isCancelled($request)
        ) {
            throw new NotFoundHttpException('Not found.');
        }
    }

    /**
     * The Accept notice's fields, the Mentor's account name and the Course title (AD-8). Read once
     * per Accept: a group has one Mentor and one Course, so every Learner's notice shares them.
     *
     * @return array{0: string, 1: string}
     */
    private function noticeFields(int $mentorId, int $courseId): array
    {
        return [
            $this->userNames->handle([$mentorId])[$mentorId] ?? '',
            $this->courseTitles->handle([$courseId])[$courseId] ?? '',
        ];
    }

    private function accept(Request $request, string $mentorName, string $courseTitle): MentorMatch
    {
        $request->accepted_at = now();
        $request->save();

        $match = MentorMatch::query()->create([
            'request_id' => $request->id,
            'started_at' => now(),
        ]);

        // Stored only after this transaction commits (AD-11). The Mentor's account name and the
        // Course title, and nothing else: no route, no group (AD-8). A throw anywhere in the
        // transaction stores nothing.
        $this->sendNotice->handle($request->learner_id, NoticeType::RequestAccepted, [
            'person_name' => $mentorName,
            'course_title' => $courseTitle,
        ]);

        return $match;
    }
}
