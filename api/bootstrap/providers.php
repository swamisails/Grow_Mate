<?php

use App\Modules\Accounts\AccountsServiceProvider;
use App\Modules\Courses\CoursesServiceProvider;
use App\Modules\Matching\MatchingServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    AccountsServiceProvider::class,
    CoursesServiceProvider::class,
    MatchingServiceProvider::class,
];
