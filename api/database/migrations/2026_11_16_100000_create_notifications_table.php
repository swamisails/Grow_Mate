<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Event notices (R22, AD-11): Laravel's standard database-channel `notifications` table, owned by
 * the Notifications module and written only by `SendNotice`. Ids are UUIDv7 strings; `type` is a
 * `NoticeType` value and `data` holds that type's fields. `read_at` is unused (no read state).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
