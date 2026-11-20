<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Option;
use App\Modules\Courses\Models\Question;
use App\Modules\Courses\Models\Stage;
use App\Modules\Courses\Models\StageLevel;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * What scoring needs from one Stage of a published Course (AD-14): its id, its Pass mark, and for
 * each question its option ids and the correct one. For the API's scoring only; never returned.
 */
class StageAnswerKey
{
    public function __construct(private readonly PublishedCourse $publishedCourse) {}

    /**
     * @return array{stage_id: int, pass_mark: int, questions: array<int, array{option_ids: list<int>, correct_option_id: int|null}>}
     *
     * @throws NotFoundHttpException when there is no published Course with this id
     */
    public function handle(int $courseId, StageLevel $level): array
    {
        $course = $this->publishedCourse->handle($courseId);

        $stage = Stage::query()
            ->where('course_id', $course->id)
            ->where('level', $level->value)
            ->with('questions.options')
            ->first();

        abort_if($stage === null, 404, 'Not found.');

        $questions = [];
        foreach ($stage->questions as $question) {
            /** @var Question $question */
            $questions[$question->id] = [
                'option_ids' => $question->options->map(fn (Option $option): int => $option->id)->values()->all(),
                'correct_option_id' => $question->options->first(fn (Option $option): bool => $option->is_correct)?->id,
            ];
        }

        return ['stage_id' => $stage->id, 'pass_mark' => (int) $stage->pass_mark, 'questions' => $questions];
    }
}
