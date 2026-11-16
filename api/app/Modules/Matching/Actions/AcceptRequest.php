<?php

namespace App\Modules\Matching\Actions;

use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Matching\Queries\RequestState;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Accepts one ungrouped Request addressed to the caller, and creates its Match. A group, a
 * stranger, a Request already accepted, and one at or after `sent_at` + 144 hours are the same
 * 404, and none of them gains a Match.
 */
class AcceptRequest
{
    public function __construct(private readonly RequestState $requestState) {}

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

            return MentorMatch::query()->create([
                'request_id' => $request->id,
                'started_at' => now(),
            ]);
        });
    }
}
