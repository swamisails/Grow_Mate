<?php

namespace App\Modules\Courses\Database\Seeders;

use App\Modules\Courses\Actions\CreateCourse;
use App\Modules\Courses\Actions\PublishCourse;
use App\Modules\Courses\Actions\SaveCourseDraft;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\StageLevel;
use Illuminate\Database\Seeder;

class CoursesSeeder extends Seeder
{
    /**
     * Demo Courses, complete and published, in `local` and `e2e` only (AD-17: runs after Accounts).
     * Written through the module's own Actions; a title that already exists is left as it is, so
     * reseeding changes nothing.
     */
    public function run(CreateCourse $createCourse, SaveCourseDraft $saveCourseDraft, PublishCourse $publishCourse): void
    {
        if (! app()->environment(['local', 'e2e'])) {
            return;
        }

        foreach ($this->demoCourses() as $demo) {
            if (Course::query()->where('title', $demo['title'])->exists()) {
                continue;
            }

            $course = $createCourse->handle($demo['title'], $demo['description']);

            $saveCourseDraft->handle($course->id, [
                'title' => $demo['title'],
                'description' => $demo['description'],
                'stages' => array_map(fn (StageLevel $level): array => [
                    'level' => $level->value,
                    'pass_mark' => 70,
                    'questions' => array_map(fn (array $question): array => [
                        'text' => $question['text'],
                        'options' => [
                            ['text' => $question['correct'], 'is_correct' => true],
                            ['text' => $question['other'], 'is_correct' => false],
                        ],
                    ], $demo['questions'][$level->value]),
                ], StageLevel::cases()),
            ]);

            $publishCourse->handle($course->id);
        }
    }

    /**
     * @return list<array{
     *     title: string,
     *     description: string,
     *     questions: array<string, list<array{text: string, correct: string, other: string}>>,
     * }>
     */
    private function demoCourses(): array
    {
        return [
            [
                'title' => 'Python Basics',
                'description' => 'Variables, collections and functions in Python.',
                'questions' => [
                    'bronze' => [['text' => 'Which keyword defines a function?', 'correct' => 'def', 'other' => 'function']],
                    'silver' => [['text' => 'Which type holds key-value pairs?', 'correct' => 'dict', 'other' => 'tuple']],
                    'gold' => [['text' => 'What does a function return without a return statement?', 'correct' => 'None', 'other' => '0']],
                ],
            ],
            [
                'title' => 'Git Essentials',
                'description' => 'Commits, branches and merges with Git.',
                'questions' => [
                    'bronze' => [['text' => 'Which command records staged changes?', 'correct' => 'git commit', 'other' => 'git add']],
                    'silver' => [['text' => 'Which command creates a branch and switches to it?', 'correct' => 'git switch -c', 'other' => 'git branch -d']],
                    'gold' => [['text' => 'Which command replays commits onto another base?', 'correct' => 'git rebase', 'other' => 'git stash']],
                ],
            ],
        ];
    }
}
