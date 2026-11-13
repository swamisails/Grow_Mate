<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Mentors module's tables (AD-7): one Mentor route per Employee and Course, written only by
 * `GrantMentor`. The unique key keeps the first route a pair was granted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mentor_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            // gold_pass, registration_approval or group_assignment_accepted (Mentors\Models\Route). Never returned (AD-8).
            $table->string('route', 32);
            $table->timestamps();

            $table->unique(['user_id', 'course_id']);
            $table->index('course_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mentor_routes');
    }
};
