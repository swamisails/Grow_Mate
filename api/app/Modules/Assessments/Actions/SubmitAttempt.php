<?php

namespace App\Modules\Assessments\Actions;

use App\Modules\Accounts\Queries\LockUser;
use App\Modules\Assessments\Exceptions\AssessmentRuleViolation;
use App\Modules\Assessments\Models\StageAttempt;
use App\Modules\Assessments\Queries\StageAvailability;
use App\Modules\Courses\Models\StageLevel;
use App\Modules\Courses\Queries\StageAnswerKey;
use App\Modules\Mentors\Actions\GrantMentor;
use App\Modules\Mentors\Models\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * A Learner submits one attempt at a Stage. The answers must name every question of the Stage once,
 * each with one of its own options. Inside one transaction the Learner's row is locked, so two
 * submits serialise, availability is checked again, and the attempt is scored and stored once with
 * the Pass mark used (AD-14). A pass is correct × 100 ≥ Pass mark × questions, in integers.
 *
 * A Gold pass makes the Learner a Mentor for the Course in the same transaction (R19, AD-7):
 * `GrantMentor` keeps an existing Mentor's first route. No notice is sent (C6, C8).
 */
class SubmitAttempt
{
    public function __construct(
        private readonly StageAnswerKey $stageAnswerKey,
        private readonly StageAvailability $stageAvailability,
        private readonly LockUser $lockUser,
        private readonly GrantMentor $grantMentor,
    ) {}

    /**
     * @param  list<array{question_id: int, option_id: int}>  $answers
     *
     * @throws NotFoundHttpException when there is no published Course with this id
     * @throws AssessmentRuleViolation when the Stage isn't available to the Learner
     * @throws ValidationException when the answers don't fit the Stage's questions
     */
    public function handle(int $learnerId, int $courseId, StageLevel $level, array $answers): StageAttempt
    {
        $key = $this->stageAnswerKey->handle($courseId, $level);
        $this->stageAvailability->assertAvailable($learnerId, $courseId, $level);

        $chosen = [];
        foreach ($answers as $answer) {
            $question = $key['questions'][$answer['question_id']] ?? null;
            if ($question === null || isset($chosen[$answer['question_id']]) || ! in_array($answer['option_id'], $question['option_ids'], true)) {
                throw ValidationException::withMessages(['answers' => ['Answer every question once, with one of its options.']]);
            }
            $chosen[$answer['question_id']] = $answer['option_id'];
        }

        if (count($chosen) !== count($key['questions'])) {
            throw ValidationException::withMessages(['answers' => ['Answer every question once, with one of its options.']]);
        }

        $correct = 0;
        foreach ($key['questions'] as $questionId => $question) {
            if ($question['correct_option_id'] !== null && $chosen[$questionId] === $question['correct_option_id']) {
                $correct++;
            }
        }
        $total = count($key['questions']);

        return DB::transaction(function () use ($learnerId, $courseId, $level, $key, $correct, $total): StageAttempt {
            // The user first, then the Course (through `GrantMentor`'s foreign key): the same
            // user → course order `AcceptRequest` takes (AD-3).
            $this->lockUser->handle($learnerId);
            $this->stageAvailability->assertAvailable($learnerId, $courseId, $level);

            $attempt = StageAttempt::query()->create([
                'learner_id' => $learnerId,
                'course_id' => $courseId,
                'stage_id' => $key['stage_id'],
                'correct_count' => $correct,
                'question_count' => $total,
                'pass_mark' => $key['pass_mark'],
                'passed' => $correct * 100 >= $key['pass_mark'] * $total,
                'submitted_at' => now(),
            ]);

            if ($level === StageLevel::Gold && $attempt->passed) {
                $this->grantMentor->handle($learnerId, $courseId, Route::GoldPass);
            }

            return $attempt;
        });
    }
}
