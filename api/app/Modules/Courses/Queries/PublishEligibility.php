<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\Option;
use App\Modules\Courses\Models\Question;
use App\Modules\Courses\Models\Stage;
use App\Modules\Courses\Models\StageLevel;

/**
 * Whether a Course's saved content can be published (AD-2: the SPA shows this as `can_publish`).
 * The only implementation of completeness, used by the authoring read and by PublishCourse.
 *
 * Complete means: a nonblank title, and Bronze, Silver and Gold each with a whole-number Pass mark
 * from 1 to 100 and at least one question; every question has nonblank text, at least two nonblank
 * options and exactly one correct option. A published Course can't be published again.
 */
class PublishEligibility
{
    public function handle(Course $course): bool
    {
        if ($course->published_at !== null || trim($course->title) === '') {
            return false;
        }

        $course->loadMissing('stages.questions.options');

        if ($course->stages->count() !== count(StageLevel::cases())) {
            return false;
        }

        foreach (StageLevel::cases() as $level) {
            $stage = $course->stages->first(fn (Stage $stage) => $stage->level === $level);

            if ($stage === null
                || ! is_int($stage->pass_mark)
                || $stage->pass_mark < 1
                || $stage->pass_mark > 100
                || $stage->questions->isEmpty()) {
                return false;
            }

            if (! $stage->questions->every(fn (Question $question) => $this->isComplete($question))) {
                return false;
            }
        }

        return true;
    }

    private function isComplete(Question $question): bool
    {
        return trim($question->text) !== ''
            && $question->options->count() >= 2
            && $question->options->every(fn (Option $option) => trim($option->text) !== '')
            && $question->options->filter(fn (Option $option) => $option->is_correct)->count() === 1;
    }
}
