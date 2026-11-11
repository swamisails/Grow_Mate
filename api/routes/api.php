<?php

use App\Modules\Accounts\Http\Controllers\AdminPingController;
use App\Modules\Accounts\Http\Controllers\MeController;
use App\Modules\Accounts\Http\Controllers\SignInController;
use App\Modules\Accounts\Http\Controllers\SignOutController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // AD-9: Sanctum SPA cookie session; the SPA calls GET /sanctum/csrf-cookie first.
    Route::post('login', SignInController::class);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', SignOutController::class);
        Route::get('me', MeController::class);

        Route::prefix('admin')->middleware('can:admin')->group(function () {
            Route::get('ping', AdminPingController::class);
        });
    });
});
