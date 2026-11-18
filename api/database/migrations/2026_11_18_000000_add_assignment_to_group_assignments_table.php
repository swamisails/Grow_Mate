<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A group assignment (UJ-4): the Course, the chosen Employee and when Admin assigned it. Its
 * Requests carry the same time as `sent_at`. Its id is stored on each Request and never returned
 * (AD-8). Accepted, refused and pending are derived from the Requests, never stored.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_assignments', function (Blueprint $table) {
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mentor_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('group_assignments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('course_id');
            $table->dropConstrainedForeignId('mentor_id');
            $table->dropColumn('created_at');
        });
    }
};
