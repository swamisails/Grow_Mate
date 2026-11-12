<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Courses module's tables: a Course has exactly three Stages (Bronze, Silver, Gold), each Stage
 * has ordered questions, and each question has ordered options. Deleting a Course removes it all.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            // AD-4: published is a fact (when), never a status column. Null while a draft.
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('level', 6);
            // Null until Admin enters it; Publish (entry 4) refuses a Stage without one.
            $table->unsignedTinyInteger('pass_mark')->nullable();
            $table->timestamps();

            $table->unique(['course_id', 'level']);
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stage_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position');
            $table->text('text');
            $table->timestamps();

            $table->unique(['stage_id', 'position']);
        });

        Schema::create('options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position');
            $table->string('text');
            $table->boolean('is_correct');
            $table->timestamps();

            $table->unique(['question_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('options');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('stages');
        Schema::dropIfExists('courses');
    }
};
