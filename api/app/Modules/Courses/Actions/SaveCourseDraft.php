<?php

namespace App\Modules\Courses\Actions;

use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\Option;
use App\Modules\Courses\Models\Question;
use App\Modules\Courses\Models\StageLevel;
use App\Modules\Courses\Queries\CourseForAuthoring;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

class SaveCourseDraft
{
    public function __construct(private readonly CourseForAuthoring $courseForAuthoring) {}

    /**
     * Saves the whole draft document at once: title, description, and per Stage its Pass mark and
     * questions. Each Stage's questions and options are replaced in the order given; the Stages
     * themselves are never replaced, so anything referencing a Stage keeps pointing at it.
     *
     * @param  array{
     *     title: string,
     *     description?: string|null,
     *     stages: list<array{
     *         level: string,
     *         pass_mark?: int|string|null,
     *         questions?: list<array{text: string, options: list<array{text: string, is_correct: mixed}>}>,
     *     }>,
     * }  $document  already validated by SaveCourseDraftRequest
     *
     * @throws ModelNotFoundException<Course> (a 404) when there is no such Course
     */
    public function handle(int $courseId, array $document): Course
    {
        DB::transaction(function () use ($courseId, $document): void {
            // Serialise concurrent saves of the same Course.
            $locked = Course::query()->whereKey($courseId)->lockForUpdate()->firstOrFail();

            $locked->update([
                'title' => $document['title'],
                'description' => $document['description'] ?? null,
            ]);

            foreach ($document['stages'] as $stageDocument) {
                $stage = $locked->stages()
                    ->where('level', StageLevel::from($stageDocument['level']))
                    ->firstOrFail();

                $passMark = $stageDocument['pass_mark'] ?? null;
                $stage->update(['pass_mark' => $passMark === null ? null : (int) $passMark]);

                $questionIds = $stage->questions()->pluck('id');
                Option::query()->whereIn('question_id', $questionIds)->delete();
                Question::query()->whereKey($questionIds)->delete();

                foreach (array_values($stageDocument['questions'] ?? []) as $q => $questionDocument) {
                    $question = $stage->questions()->create([
                        'position' => $q + 1,
                        'text' => $questionDocument['text'],
                    ]);

                    foreach (array_values($questionDocument['options']) as $o => $optionDocument) {
                        $question->options()->create([
                            'position' => $o + 1,
                            'text' => $optionDocument['text'],
                            'is_correct' => filter_var($optionDocument['is_correct'], FILTER_VALIDATE_BOOLEAN),
                        ]);
                    }
                }
            }
        });

        return $this->courseForAuthoring->handle($courseId);
    }
}
