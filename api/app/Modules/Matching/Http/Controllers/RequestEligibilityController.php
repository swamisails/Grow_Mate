<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Http\Resources\RequestEligibilityResource;
use App\Modules\Matching\Queries\LearnerEligibility;
use Illuminate\Http\Request;

class RequestEligibilityController
{
    public function __invoke(int $course, Request $request, LearnerEligibility $learnerEligibility): RequestEligibilityResource
    {
        $learnerId = (int) $request->user()?->getAuthIdentifier();

        return new RequestEligibilityResource([
            'can_request' => $learnerEligibility->allows($learnerId, $course),
        ]);
    }
}
