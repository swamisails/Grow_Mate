<?php

namespace Tests\Feature\Courses;

use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Models\Option;
use App\Modules\Courses\Models\Question;
use PHPUnit\Framework\Attributes\DataProvider;

class SaveCourseDraftTest extends CoursesTestCase
{
    public function test_a_full_draft_round_trips_with_identical_content_and_order(): void
    {
        $course = Course::factory()->create();
        $stageIds = $course->stages->pluck('id')->all();

        // Texts deliberately out of alphabetical order, so only the authored order can explain the result.
        $document = $this->document([
            0 => ['pass_mark' => 60, 'questions' => [
                $this->question('Which clause filters rows?', ['WHERE', 'ORDER BY', 'GROUP BY'], 0),
                $this->question('Which keyword removes duplicates?', ['UNIQUE', 'DISTINCT'], 1),
            ]],
            1 => ['pass_mark' => 70, 'questions' => [
                $this->question('Zebra join?', ['Z', 'A', 'M'], 2),
            ]],
            2 => ['pass_mark' => 100, 'questions' => [
                $this->question('Window functions run after?', ['HAVING', 'FROM'], 0),
                $this->question('A CTE starts with?', ['WITH', 'AS'], 0),
            ]],
        ]);

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $document)
            ->assertOk();

        $read = $this->getJson("/api/v1/admin/courses/{$course->id}")->assertOk();

        $this->assertSame($document, $this->withoutIds($read->json('data')));
        // The Stages are kept, never replaced.
        $this->assertSame($stageIds, $read->json('data.stages.*.id'));
        $read->assertJsonPath('data.status', 'draft');
        $this->assertNull($course->fresh()->published_at);
    }

    public function test_saving_again_replaces_questions_and_options_in_the_new_order(): void
    {
        $course = Course::factory()->create();
        $admin = $this->signedInAdmin();

        $admin->putJson("/api/v1/admin/courses/{$course->id}", $this->document([
            0 => ['questions' => [
                $this->question('First?', ['a', 'b']),
                $this->question('Second?', ['c', 'd']),
            ]],
        ]))->assertOk();

        $reordered = $this->document([
            0 => ['questions' => [
                $this->question('Second?', ['d', 'c'], 1),
            ]],
        ]);
        $admin->putJson("/api/v1/admin/courses/{$course->id}", $reordered)->assertOk();

        $read = $this->getJson("/api/v1/admin/courses/{$course->id}")->assertOk();
        $this->assertSame($reordered, $this->withoutIds($read->json('data')));
        $this->assertSame(1, Question::query()->count());
        $this->assertSame(2, Option::query()->count());
    }

    public function test_a_partial_draft_saves_with_empty_stages_and_a_blank_pass_mark(): void
    {
        $course = Course::factory()->create();

        $document = $this->document([
            0 => ['pass_mark' => 50, 'questions' => [$this->question('Which clause filters rows?', ['WHERE', 'ORDER BY'])]],
            1 => ['pass_mark' => 80],
            // Gold: no questions and a blank Pass mark.
        ]);

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $document)
            ->assertOk();

        $read = $this->getJson("/api/v1/admin/courses/{$course->id}")->assertOk();
        $this->assertSame($document, $this->withoutIds($read->json('data')));
        $read->assertJsonPath('data.stages.1.questions', [])
            ->assertJsonPath('data.stages.2.questions', [])
            ->assertJsonPath('data.stages.2.pass_mark', null);
    }

    public function test_the_response_is_the_saved_course(): void
    {
        $course = Course::factory()->create();
        $document = $this->document([0 => ['pass_mark' => 50]], title: 'Renamed');

        $saved = $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $document)
            ->assertOk();

        $this->assertSame($document, $this->withoutIds($saved->json('data')));
    }

    public function test_a_blank_title_is_refused_under_title(): void
    {
        $course = Course::factory()->create(['title' => 'Kept']);

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $this->document(title: ''))
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['title']);

        $this->assertSame('Kept', $course->fresh()->title);
    }

    public function test_a_question_with_one_option_is_refused_under_that_question(): void
    {
        $course = Course::factory()->create();

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $this->document([
                1 => ['questions' => [
                    $this->question('Fine?', ['yes', 'no']),
                    $this->question('Lonely?', ['only'], 0),
                ]],
            ]))
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['stages.1.questions.1.options'])
            ->assertJsonPath('errors', ['stages.1.questions.1.options' => ['A question needs at least 2 options.']]);

        $this->assertSame(0, Question::query()->count());
    }

    public function test_a_question_with_no_options_is_refused_under_that_question(): void
    {
        $course = Course::factory()->create();

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $this->document([
                0 => ['questions' => [['text' => 'Empty?', 'options' => []]]],
            ]))
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['stages.0.questions.0.options']);
    }

    public function test_a_question_with_two_correct_options_is_refused_under_that_question(): void
    {
        $course = Course::factory()->create();
        $question = $this->question('Two right?', ['a', 'b', 'c']);
        $question['options'][2]['is_correct'] = true;

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $this->document([2 => ['questions' => [$question]]]))
            ->assertUnprocessable()
            ->assertJsonPath('errors', ['stages.2.questions.0.options' => ['Mark exactly one option as correct.']]);
    }

    public function test_a_question_with_no_correct_option_is_refused_under_that_question(): void
    {
        $course = Course::factory()->create();

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $this->document([
                0 => ['questions' => [$this->question('None right?', ['a', 'b'], null)]],
            ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors', ['stages.0.questions.0.options' => ['Mark exactly one option as correct.']]);
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidPassMarks(): array
    {
        return [
            'zero' => [0],
            'over 100' => [101],
            'not whole' => [50.5],
            'negative' => [-1],
            'not a number' => ['fifty'],
        ];
    }

    #[DataProvider('invalidPassMarks')]
    public function test_an_out_of_range_or_non_whole_pass_mark_is_refused_under_it(mixed $passMark): void
    {
        $course = Course::factory()->create();

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $this->document([1 => ['pass_mark' => $passMark]]))
            ->assertUnprocessable()
            ->assertJsonPath('errors', ['stages.1.pass_mark' => ['The pass mark must be a whole number from 1 to 100.']]);

        $this->assertNull($course->stages()->where('level', 'silver')->value('pass_mark'));
    }

    public function test_the_pass_mark_bounds_are_accepted(): void
    {
        $course = Course::factory()->create();

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $this->document([0 => ['pass_mark' => 1], 2 => ['pass_mark' => 100]]))
            ->assertOk()
            ->assertJsonPath('data.stages.*.pass_mark', [1, null, 100]);
    }

    public function test_blank_question_and_option_text_is_refused_under_each_field(): void
    {
        $course = Course::factory()->create();

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $this->document([
                0 => ['questions' => [$this->question('  ', ['WHERE', ' '])]],
            ]))
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['stages.0.questions.0.text', 'stages.0.questions.0.options.1.text']);
    }

    public function test_stages_must_be_bronze_silver_gold_in_that_order(): void
    {
        $course = Course::factory()->create();
        $document = $this->document();
        [$document['stages'][0], $document['stages'][2]] = [$document['stages'][2], $document['stages'][0]];

        $this->signedInAdmin()
            ->putJson("/api/v1/admin/courses/{$course->id}", $document)
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['stages.0.level', 'stages.2.level']);
    }

    public function test_an_unknown_course_is_not_found(): void
    {
        $this->signedInAdmin()
            ->putJson('/api/v1/admin/courses/999', $this->document())
            ->assertNotFound();
    }

    /**
     * The read without ids, in the shape the editor sends back.
     *
     * @param  array<string, mixed>  $course
     * @return array<string, mixed>
     */
    private function withoutIds(array $course): array
    {
        return [
            'title' => $course['title'],
            'description' => $course['description'],
            'stages' => array_map(fn (array $stage) => [
                'level' => $stage['level'],
                'pass_mark' => $stage['pass_mark'],
                'questions' => array_map(fn (array $question) => [
                    'text' => $question['text'],
                    'options' => array_map(fn (array $option) => [
                        'text' => $option['text'],
                        'is_correct' => $option['is_correct'],
                    ], $question['options']),
                ], $stage['questions']),
            ], $course['stages']),
        ];
    }
}
