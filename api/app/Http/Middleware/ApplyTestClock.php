<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applies the one frozen UTC instant stored by POST /api/v1/testing/clock (AD-6). Registered only
 * when APP_ENV is e2e, so the next request — not the clock request itself — sees that instant.
 */
class ApplyTestClock
{
    public const CACHE_KEY = 'testing-clock';

    public function handle(Request $request, Closure $next): Response
    {
        $stored = Cache::get(self::CACHE_KEY);
        if (is_string($stored) && $stored !== '') {
            Carbon::setTestNow(Carbon::parse($stored, 'UTC'));
        } else {
            // A worker keeps the last setTestNow until this runs, so a cleared clock has to release it.
            Carbon::setTestNow();
        }

        return $next($request);
    }
}
