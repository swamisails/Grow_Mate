<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Registration decisions (R3, AD-4): Admin's one final decision on each Course an Employee named in
 * their Mentor check, written only by `DecideRegistration`. The unique key makes a second decision,
 * even a concurrent one, fail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            // approved or refused (Mentors\Models\Outcome).
            $table->string('outcome', 16);
            $table->timestamps();

            $table->unique(['user_id', 'course_id']);
            $table->index('course_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_decisions');
    }
};
