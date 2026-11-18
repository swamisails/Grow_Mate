<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A Match can end. `ended_at` null is a live Match. `end_reason` is `quit` or
 * `course_completed`. Accept still writes only `started_at`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->timestamp('ended_at')->nullable();
            // quit or course_completed (Matching\Models\MatchEndReason). Null while the Match is live.
            $table->string('end_reason', 32)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn(['ended_at', 'end_reason']);
        });
    }
};
