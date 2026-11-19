<?php

namespace App\Modules\Matching\Http\Controllers;

use App\Modules\Matching\Actions\CompleteCourse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CompleteCourseController
{
    /**
     * The route id is `{match}`. The HTTP request is `$http` so Laravel does not inject the id into it.
     */
    public function __invoke(int $match, Request $http, CompleteCourse $completeCourse): Response
    {
        $completeCourse->handle($match, (int) $http->user()?->getAuthIdentifier());

        return response()->noContent();
    }
}
