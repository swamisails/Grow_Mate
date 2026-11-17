<?php

namespace App\Http\Controllers;

use App\Modules\Matching\Models\Request as MatchingRequest;
use App\Modules\Notifications\NoticeType;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Removes one Request, and its Match, during e2e only. The clock spec accepts or leaves a Request
 * so cancelling does not depend on the test clock; a live Match would then block a later spec.
 * Deleting the row leaves the Learner able to Request again. The send and accept notices for the
 * two people go with it: they carry no Request id, and a later spec must not see them. The
 * response has no Mentor route and no group id.
 */
class DeleteTestRequestController
{
    public function __invoke(int $id): JsonResponse
    {
        $request = MatchingRequest::query()->find($id);

        if ($request !== null) {
            DB::table('notifications')
                ->whereIn('notifiable_id', [$request->learner_id, $request->mentor_id])
                ->whereIn('type', [NoticeType::RequestSent->value, NoticeType::RequestAccepted->value])
                ->delete();

            $request->delete();
        }

        return response()->json([
            'data' => ['deleted' => true],
        ]);
    }
}
