<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Option;
use App\Modules\Courses\Models\Question;
use App\Modules\Courses\Models\Stage;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The taking read (AD-14): one Stage of a published Course, its questions and their options in
 * authored `position` order, with the Course's id and title. `is_correct` is never selected, so it
 * can't reach a Learner. Whether the Learner may take the Stage is Assessments' to decide.
 */
class StageForTaking
{
    public function __construct(private readonly PublishedCourse $publishedCourse) {}

    /**
     * @return array{course: array{id: int, title: string}, level: string, questions: list<array{id: int, text: string, options: list<array{id: int, text: string}>}>}
     *
     * @throws NotFoundHttpException when there is no published Course with this id
     */
    public function handle(int $courseId, StageLevel $level): array
    {
        $course = $this->publishedCourse->handle($courseId);

        $stage = Stage::query()
            ->where('course_id', $course->id)
            ->where('level', $level->value)
            ->with([
                'questions' => fn (HasMany $query) => $query->select(['id', 'stage_id', 'position', 'text']),
                'questions.options' => fn (HasMany $query) => $query->select(['id', 'question_id', 'position', 'text']),
            ])
            ->first(['id', 'course_id', 'level']);

        abort_if($stage === null, 404, 'Not found.');

        return [
            'course' => ['id' => $course->id, 'title' => $course->title],
            'level' => $stage->level->value,
            'questions' => $stage->questions->map(fn (Question $question): array => [
                'id' => $question->id,
                'text' => $question->text,
                'options' => $question->options->map(fn (Option $option): array => [
                    'id' => $option->id,
                    'text' => $option->text,
                ])->values()->all(),
            ])->values()->all(),
        ];
    }
}
