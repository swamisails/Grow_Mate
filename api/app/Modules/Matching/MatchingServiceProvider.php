<?php

namespace App\Modules\Matching;

use App\Modules\Matching\Queries\RequestTimeNotices;
use App\Modules\Notifications\Queries\TimeNoticeSource;
use Illuminate\Support\ServiceProvider;

class MatchingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(TimeNoticeSource::class, RequestTimeNotices::class);
    }
}
