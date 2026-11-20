<?php

namespace App\Modules\Assessments\Models;

use Database\Factories\StageAttemptFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * One submitted attempt at a Stage (AD-4): the counts, the Pass mark used and `passed`, judged once
 * at submission (AD-14). Keyed by Learner, Course and Stage, with no Match. Written only by
 * `SubmitAttempt`. Never returned as it is: the counts and the Pass mark stay in the API.
 *
 * @property int $id
 * @property int $learner_id
 * @property int $course_id
 * @property int $stage_id
 * @property int $correct_count
 * @property int $question_count
 * @property int $pass_mark
 * @property bool $passed
 * @property Carbon $submitted_at
 */
#[Fillable(['learner_id', 'course_id', 'stage_id', 'correct_count', 'question_count', 'pass_mark', 'passed', 'submitted_at'])]
#[UseFactory(StageAttemptFactory::class)]
class StageAttempt extends Model
{
    /** @use HasFactory<StageAttemptFactory> */
    use HasFactory;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'learner_id' => 'integer',
            'course_id' => 'integer',
            'stage_id' => 'integer',
            'correct_count' => 'integer',
            'question_count' => 'integer',
            'pass_mark' => 'integer',
            'passed' => 'boolean',
            'submitted_at' => 'datetime',
        ];
    }
}
