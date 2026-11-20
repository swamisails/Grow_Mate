<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Assessments' facts (AD-4): one row per submitted attempt, keyed by Learner, Course and Stage. It
 * stores the integer counts, the Pass mark used and whether it passed, judged once at submission
 * (AD-14). It has no Match column: an attempt belongs to the Learner, not to a Match. Availability
 * is derived from these rows, never stored.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stage_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stage_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('correct_count');
            $table->unsignedInteger('question_count');
            $table->unsignedTinyInteger('pass_mark');
            $table->boolean('passed');
            $table->timestamp('submitted_at');

            $table->index(['learner_id', 'course_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stage_attempts');
    }
};
