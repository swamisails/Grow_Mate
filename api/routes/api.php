<?php

use App\Http\Controllers\DeleteTestRequestController;
use App\Http\Controllers\SetTestClockController;
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
use App\Modules\Matching\Http\Controllers\AcceptRequestController;
use App\Modules\Matching\Http\Controllers\HomeController;
use App\Modules\Matching\Http\Controllers\ListRequestsController;
use App\Modules\Matching\Http\Controllers\RequestEligibilityController;
use App\Modules\Matching\Http\Controllers\SendRequestController;
use App\Modules\Matching\Http\Controllers\ShowMatchController;
use App\Modules\Mentors\Http\Controllers\ApproveRegistrationController;
use App\Modules\Mentors\Http\Controllers\CourseMentorsController;
use App\Modules\Mentors\Http\Controllers\EmployeeRegistrationDecisionsController;
use App\Modules\Mentors\Http\Controllers\MentorCheckController;
use App\Modules\Mentors\Http\Controllers\RefuseRegistrationController;
use App\Modules\Mentors\Http\Controllers\RegistrationDecisionsController;
use App\Modules\Mentors\Http\Controllers\SubmitMentorCheckController;
use App\Modules\Notifications\Http\Controllers\NoticesController;
use App\Modules\Progress\Http\Controllers\CourseProgressController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // AD-6: outside the employee group, and absent unless APP_ENV is e2e.
    if (app()->environment('e2e')) {
        Route::post('testing/clock', SetTestClockController::class);
        Route::delete('testing/clock', [SetTestClockController::class, 'clear']);
        Route::delete('testing/requests/{id}', DeleteTestRequestController::class)->where('id', '[0-9]{1,18}');
    }

    // AD-9: Sanctum SPA cookie session; the SPA calls GET /sanctum/csrf-cookie first.
    // Refused attempts are throttled per email and IP (AccountsServiceProvider).
    Route::post('login', SignInController::class)->middleware('throttle:sign-in');
    // Sign up creates an Employee only, never an Admin (C2). Refused attempts are throttled per IP.
    Route::post('register', SignUpController::class)->middleware('throttle:sign-up');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', SignOutController::class);
        Route::get('me', MeController::class);

        // Employee routes. The role check runs before any lookup.
        Route::middleware('can:employee')->group(function () {
            // Employee Courses (R6): published Courses only.
            Route::get('courses', PublishedCoursesController::class);
            Route::get('courses/{course}', PublishedCourseController::class)->where('course', '[0-9]{1,18}');
            // A published Course's Mentors (R6), without the viewer and without any route (AD-8).
            Route::get('courses/{course}/mentors', CourseMentorsController::class)->where('course', '[0-9]{1,18}');
            // A Request, and whether this Learner may send one. Progress is its own read (AD-3).
            Route::get('courses/{course}/request-eligibility', RequestEligibilityController::class)->where('course', '[0-9]{1,18}');
            Route::post('courses/{course}/requests', SendRequestController::class)->where('course', '[0-9]{1,18}');
            Route::get('courses/{course}/progress', CourseProgressController::class)->where('course', '[0-9]{1,18}');
            Route::get('requests', ListRequestsController::class);
            Route::post('requests/{request}/accept', AcceptRequestController::class)->where('request', '[0-9]{1,18}');
            // Home's Learning and Mentoring, and the Match either party opens. Admin stays outside this group.
            Route::get('home', HomeController::class);
            Route::get('matches/{match}', ShowMatchController::class)->where('match', '[0-9]{1,18}');
            // The Employee's one Mentor check (R2, AD-15): its status, then one submission or skip.
            Route::get('mentor-check', MentorCheckController::class);
            Route::post('mentor-check', SubmitMentorCheckController::class);
            // The Employee's own Registration decisions (R3, AD-8): approved and refused Courses, apart.
            Route::get('registration-decisions', EmployeeRegistrationDecisionsController::class);
            // The Employee's notices (AD-11), newest first. Admin is never a recipient, so has no inbox.
            Route::get('notices', NoticesController::class);
        });

        Route::prefix('admin')->middleware('can:admin')->group(function () {
            Route::get('ping', AdminPingController::class);

            // Courses (R5): authoring drafts, then Publish. A Course id that isn't a number, or doesn't fit an int, is a 404.
            Route::get('courses', AdminCoursesController::class);
            Route::post('courses', CreateCourseController::class);
            Route::get('courses/{course}', ShowCourseController::class)->where('course', '[0-9]{1,18}');
            Route::post('courses/{course}/publish', PublishCourseController::class)->middleware('can:publish,'.Course::class)->where('course', '[0-9]{1,18}');
            Route::put('courses/{course}', SaveCourseDraftController::class)->where('course', '[0-9]{1,18}');

            // Registration decisions (R3): every Mentor-check Course, then one final Approve or Refuse each.
            // The id is the `mentor_check_courses` row's; one that isn't a number, or doesn't fit an int, is a 404.
            Route::get('registration-decisions', RegistrationDecisionsController::class);
            Route::post('registration-decisions/{id}/approve', ApproveRegistrationController::class)->where('id', '[0-9]{1,18}');
            Route::post('registration-decisions/{id}/refuse', RefuseRegistrationController::class)->where('id', '[0-9]{1,18}');
        });
    });
});
