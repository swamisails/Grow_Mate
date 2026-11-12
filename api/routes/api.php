<?php

use App\Modules\Accounts\Http\Controllers\AdminPingController;
use App\Modules\Accounts\Http\Controllers\MeController;
use App\Modules\Accounts\Http\Controllers\SignInController;
use App\Modules\Accounts\Http\Controllers\SignOutController;
use App\Modules\Courses\Http\Controllers\AdminCoursesController;
use App\Modules\Courses\Http\Controllers\CreateCourseController;
use App\Modules\Courses\Http\Controllers\SaveCourseDraftController;
use App\Modules\Courses\Http\Controllers\ShowCourseController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // AD-9: Sanctum SPA cookie session; the SPA calls GET /sanctum/csrf-cookie first.
    Route::post('login', SignInController::class);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', SignOutController::class);
        Route::get('me', MeController::class);

        Route::prefix('admin')->middleware('can:admin')->group(function () {
            Route::get('ping', AdminPingController::class);

            // Courses (R5): authoring drafts. A Course id that isn't a number, or doesn't fit an int, is a 404.
            Route::get('courses', AdminCoursesController::class);
            Route::post('courses', CreateCourseController::class);
            Route::get('courses/{course}', ShowCourseController::class)->where('course', '[0-9]{1,18}');
            Route::put('courses/{course}', SaveCourseDraftController::class)->where('course', '[0-9]{1,18}');
        });
    });
});
