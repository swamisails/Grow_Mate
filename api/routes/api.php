<?php

use App\Modules\Accounts\Http\Controllers\AdminPingController;
use App\Modules\Accounts\Http\Controllers\MeController;
use App\Modules\Accounts\Http\Controllers\SignInController;
use App\Modules\Accounts\Http\Controllers\SignOutController;
use App\Modules\Accounts\Http\Controllers\SignUpController;
use App\Modules\Courses\Http\Controllers\AdminCoursesController;
use App\Modules\Courses\Http\Controllers\CreateCourseController;
use App\Modules\Courses\Http\Controllers\PublishCourseController;
use App\Modules\Courses\Http\Controllers\PublishedCourseController;
use App\Modules\Courses\Http\Controllers\PublishedCoursesController;
use App\Modules\Courses\Http\Controllers\SaveCourseDraftController;
use App\Modules\Courses\Http\Controllers\ShowCourseController;
use App\Modules\Courses\Models\Course;
use App\Modules\Mentors\Http\Controllers\CourseMentorsController;
use App\Modules\Mentors\Http\Controllers\MentorCheckController;
use App\Modules\Mentors\Http\Controllers\SubmitMentorCheckController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // AD-9: Sanctum SPA cookie session; the SPA calls GET /sanctum/csrf-cookie first.
    Route::post('login', SignInController::class);
    // Sign up creates an Employee only, never an Admin (C2).
    Route::post('register', SignUpController::class);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', SignOutController::class);
        Route::get('me', MeController::class);

        // Employee Courses (R6): published Courses only. The role check runs before any lookup.
        Route::middleware('can:browse,'.Course::class)->group(function () {
            Route::get('courses', PublishedCoursesController::class);
            Route::get('courses/{course}', PublishedCourseController::class)->where('course', '[0-9]{1,18}');
            // A published Course's Mentors (R6), without the viewer and without any route (AD-8).
            Route::get('courses/{course}/mentors', CourseMentorsController::class)->where('course', '[0-9]{1,18}');
            // The Employee's one Mentor check (R2, AD-15): its status, then one submission or skip.
            Route::get('mentor-check', MentorCheckController::class);
            Route::post('mentor-check', SubmitMentorCheckController::class);
        });

        Route::prefix('admin')->middleware('can:admin')->group(function () {
            Route::get('ping', AdminPingController::class);

            // Courses (R5): authoring drafts, then Publish. A Course id that isn't a number, or doesn't fit an int, is a 404.
            Route::get('courses', AdminCoursesController::class);
            Route::post('courses', CreateCourseController::class);
            Route::get('courses/{course}', ShowCourseController::class)->where('course', '[0-9]{1,18}');
            Route::post('courses/{course}/publish', PublishCourseController::class)->middleware('can:publish,'.Course::class)->where('course', '[0-9]{1,18}');
            Route::put('courses/{course}', SaveCourseDraftController::class)->where('course', '[0-9]{1,18}');
        });
    });
});
