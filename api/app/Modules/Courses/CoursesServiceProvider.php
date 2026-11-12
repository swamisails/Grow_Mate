<?php

namespace App\Modules\Courses;

use Illuminate\Support\ServiceProvider;

/**
 * The Courses module (R4, R5): Courses, their three Stages, questions and options.
 * Depends on Accounts (the `admin` gate on its routes), never the reverse (AD-3).
 */
class CoursesServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        //
    }
}
