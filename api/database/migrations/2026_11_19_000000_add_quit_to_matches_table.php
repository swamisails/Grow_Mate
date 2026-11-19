<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who quit a Match and why (AD-4). Both are null unless the Match ended with end reason `quit`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->foreignId('quit_by_id')->nullable()->constrained('users');
            $table->string('quit_reason', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('quit_by_id');
            $table->dropColumn('quit_reason');
        });
    }
};
