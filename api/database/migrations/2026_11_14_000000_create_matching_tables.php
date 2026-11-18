<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Matching's facts (AD-4): a Request's sent and accepted times, and a Match's start.
 * Open, accepted and Progress status are derived, never stored. `group_assignments` is unused
 * until a later entry; its id is stored on a Request and never returned (AD-8).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_assignments', function (Blueprint $table) {
            $table->id();
        });

        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('mentor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            // Stored for a later entry. Never returned (AD-8). Null on a Request a Learner sends.
            $table->foreignId('group_assignment_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('sent_at');
            $table->timestamp('accepted_at')->nullable();

            $table->index(['learner_id', 'course_id']);
            $table->index('mentor_id');
        });

        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            // One Match per Request. Accept is the only writer.
            $table->foreignId('request_id')->unique()->constrained('requests')->cascadeOnDelete();
            $table->timestamp('started_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
        Schema::dropIfExists('requests');
        Schema::dropIfExists('group_assignments');
    }
};
