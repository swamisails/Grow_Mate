<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Mentor check (AD-15): one per Employee, written only by `SubmitMentorCheck`. A check with no
 * Course rows is a skip. The unique `user_id` makes a second submission, even a concurrent one, fail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mentor_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('mentor_check_courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mentor_check_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['mentor_check_id', 'course_id']);
            $table->index('course_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mentor_check_courses');
        Schema::dropIfExists('mentor_checks');
    }
};
