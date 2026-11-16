<?php

namespace App\Modules\Mentors\Http\Controllers;

use App\Modules\Mentors\Http\Resources\RegistrationDecisionRowResource;
use App\Modules\Mentors\Queries\RegistrationDecisions;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RegistrationDecisionsController
{
    public function __invoke(RegistrationDecisions $registrationDecisions): AnonymousResourceCollection
    {
        return RegistrationDecisionRowResource::collection($registrationDecisions->handle());
    }
}
