<?php

namespace App\Modules\Mentors\Http\Controllers;

use App\Modules\Mentors\Http\Resources\EmployeeRegistrationDecisionsResource;
use App\Modules\Mentors\Queries\EmployeeRegistrationDecisions;
use Illuminate\Http\Request;

class EmployeeRegistrationDecisionsController
{
    public function __invoke(Request $request, EmployeeRegistrationDecisions $registrationDecisions): EmployeeRegistrationDecisionsResource
    {
        $userId = (int) $request->user()?->getAuthIdentifier();

        return new EmployeeRegistrationDecisionsResource($registrationDecisions->handle($userId));
    }
}
