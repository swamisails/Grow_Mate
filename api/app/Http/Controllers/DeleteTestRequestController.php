<?php

namespace App\Http\Controllers;

use App\Modules\Matching\Models\Request as MatchingRequest;
use Illuminate\Http\JsonResponse;

/**
 * Removes one Request, and its Match, during e2e only. The clock spec accepts or leaves a Request
 * so cancelling does not depend on the test clock; a live Match would then block a later spec.
 * Deleting the row leaves the Learner able to Request again. The response has no Mentor route
 * and no group id.
 */
class DeleteTestRequestController
{
    public function __invoke(int $id): JsonResponse
    {
        MatchingRequest::query()->whereKey($id)->delete();

        return response()->json([
            'data' => ['deleted' => true],
        ]);
    }
}
