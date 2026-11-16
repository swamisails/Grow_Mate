<?php

namespace App\Http\Controllers;

use App\Http\Middleware\ApplyTestClock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Stores one frozen UTC instant for the e2e clock (AD-6). The response is that instant only:
 * no Mentor route and no group id. The middleware applies it on the next request.
 */
class SetTestClockController
{
    public function __invoke(Request $request): JsonResponse
    {
        $instant = $request->validate([
            'now' => ['required', 'date'],
        ])['now'];

        $stored = Carbon::parse($instant)->utc()->toIso8601ZuluString();
        Cache::forever(ApplyTestClock::CACHE_KEY, $stored);

        return response()->json([
            'data' => ['now' => $stored],
        ]);
    }

    /**
     * Forgets the frozen instant so the next request uses real time again.
     * A stored wall-clock instant would stay frozen and stop time from moving.
     */
    public function clear(): JsonResponse
    {
        Cache::forget(ApplyTestClock::CACHE_KEY);

        return response()->json([
            'data' => ['now' => null],
        ]);
    }
}
