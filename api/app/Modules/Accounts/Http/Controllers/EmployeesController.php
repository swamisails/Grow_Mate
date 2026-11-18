<?php

namespace App\Modules\Accounts\Http\Controllers;

use App\Modules\Accounts\Http\Resources\EmployeeResource;
use App\Modules\Accounts\Queries\Employees;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EmployeesController
{
    public function __invoke(Employees $employees): AnonymousResourceCollection
    {
        return EmployeeResource::collection($employees->handle());
    }
}
