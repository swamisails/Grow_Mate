<?php

namespace App\Modules\Mentors\Http\Controllers;

use App\Modules\Mentors\Actions\DecideRegistration;
use App\Modules\Mentors\Http\Resources\RegistrationDecisionResource;
use App\Modules\Mentors\Models\Outcome;
use Illuminate\Http\JsonResponse;

class ApproveRegistrationController
{
    public function __invoke(int $id, DecideRegistration $decideRegistration): JsonResponse
    {
        return (new RegistrationDecisionResource($decideRegistration->handle($id, Outcome::Approved)))
            ->response()
            ->setStatusCode(201);
    }
}
