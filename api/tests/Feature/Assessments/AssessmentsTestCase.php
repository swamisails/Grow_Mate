<?php

namespace Tests\Feature\Assessments;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\Option;
use App\Modules\Courses\Models\Question;
use App\Modules\Courses\Models\Stage;
use App\Modules\Courses\Models\StageLevel;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use Illuminate\Testing\TestResponse;
use Tests\Feature\ApiTestCase;

abstract class AssessmentsTestCase extends ApiTestCase
{
    /**
     * A published Course whose Stages each have the given questions. Each question is a list of
     * option texts, and the option whose text starts with `*` is the correct one (the `*` is dropped).
     *
     * @param  array<string, array{pass_mark: int, questions: list<list<string>>}>  $stages  by level
     */
    protected function publishedCourse(array $stages = [], string $title = 'Python Basics'): Course
    {
        $course = Course::factory()->create(['title' => $title, 'published_at' => now()]);

        foreach (StageLevel::cases() as $level) {
            $spec = $stages[$level->value] ?? ['pass_mark' => 70, 'questions' => [['*Yes', 'No']]];
            $stage = $this->stage($course, $level);
            $stage->update(['pass_mark' => $spec['pass_mark']]);
            foreach ($spec['questions'] as $q => $options) {
                $question = Question::factory()->create(['stage_id' => $stage->id, 'position' => $q + 1, 'text' => "Question {$level->value} ".($q + 1).'?']);
                foreach ($options as $o => $text) {
                    Option::factory()->create([
                        'question_id' => $question->id,
                        'position' => $o + 1,
                        'text' => ltrim($text, '*'),
                        'is_correct' => str_starts_with($text, '*'),
                    ]);
                }
            }
        }

        return $course;
    }

    protected function stage(Course $course, StageLevel $level): Stage
    {
        return Stage::query()->where('course_id', $course->id)->where('level', $level->value)->firstOrFail();
    }

    protected function employee(string $name = 'Priya Nair'): User
    {
        return User::factory()->create(['name' => $name]);
    }

    /**
     * A Match of the Learner's on the Course: `live`, `quit` or `completed` (Course Completed).
     */
    protected function match(User $learner, Course $course, string $kind = 'completed'): MentorMatch
    {
        $request = Request::factory()->create([
            'learner_id' => $learner->id,
            'course_id' => $course->id,
            'sent_at' => now(),
            'accepted_at' => now(),
        ]);
        $factory = MentorMatch::factory()->state(['request_id' => $request->id]);

        return match ($kind) {
            'live' => $factory->create(),
            'quit' => $factory->quit($learner->id)->create(),
            'completed' => $factory->courseCompleted()->create(),
        };
    }

    /**
     * Answers for the Stage choosing, per question in order, the option at the given 0-based index.
     *
     * @param  list<int>  $picks
     * @return list<array{question_id: int, option_id: int}>
     */
    protected function answers(Course $course, StageLevel $level, array $picks): array
    {
        $questions = $this->stage($course, $level)->questions()->with('options')->get();

        return $questions->values()->map(fn (Question $question, int $i): array => [
            'question_id' => $question->id,
            'option_id' => $question->options[$picks[$i]]->id,
        ])->all();
    }

    /**
     * A published Course with one question per Stage and a Learner whose Match on it ended in
     * Course Completed.
     *
     * @return array{Course, User}
     */
    protected function completed(): array
    {
        $course = $this->publishedCourse();
        $priya = $this->employee();
        $this->match($priya, $course);

        return [$course, $priya];
    }

    /**
     * Submits an attempt on the Stage that picks the correct option (a pass) or a wrong one (a failure).
     */
    protected function submit(User $learner, Course $course, StageLevel $level, bool $pass): TestResponse
    {
        return $this->actingAs($learner)->postJson(
            "/api/v1/courses/{$course->id}/stages/{$level->value}/attempts",
            ['answers' => $this->answers($course, $level, [$pass ? 0 : 1])],
        );
    }

    /**
     * The taking read of the Stage.
     */
    protected function read(User $learner, Course $course, StageLevel $level): TestResponse
    {
        return $this->actingAs($learner)->getJson("/api/v1/courses/{$course->id}/stages/{$level->value}/assessment");
    }

    protected function assertHidesAnswersAndScores(TestResponse $response): void
    {
        $body = (string) $response->getContent();
        foreach (['is_correct', 'correct_count', 'question_count', 'pass_mark', 'score', 'correct'] as $key) {
            $this->assertStringNotContainsString("\"{$key}\"", $body);
        }
    }
}
