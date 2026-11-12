<?php

namespace Tests\Feature\Courses;

use App\Modules\Courses\Actions\CreateCourse;
use App\Modules\Courses\Actions\PublishCourse;
use App\Modules\Courses\Actions\SaveCourseDraft;
use App\Modules\Courses\Exceptions\CourseRuleViolation;
use App\Modules\Courses\Models\Course;
use App\Modules\Courses\Queries\CourseForAuthoring;
use Illuminate\Support\Facades\Exceptions;
use PHPUnit\Framework\Attributes\DataProvider;

class PublishCourseTest extends CoursesTestCase
{
    private function completeCourse(): Course
    {
        $course = app(CreateCourse::class)->handle('SQL Fundamentals', 'Queries and joins.');
        $stage = ['pass_mark' => 70, 'questions' => [$this->question('Which retrieves rows?', ['SELECT', 'INSERT'])]];

        return app(SaveCourseDraft::class)->handle($course->id, $this->document([$stage, $stage, $stage]));
    }

    public function test_publish_uses_saved_content_freezes_every_field_and_refuses_repeated_publish(): void
    {
        $this->signedInAdmin();
        $course = $this->completeCourse();
        $this->travelTo(now()->setDate(2026, 11, 12)->setTime(12, 0));
        $this->getJson("/api/v1/admin/courses/{$course->id}")->assertJsonPath('data.can_publish', true);

        $this->postJson("/api/v1/admin/courses/{$course->id}/publish", ['title' => 'Ignored'])
            ->assertOk()->assertJsonPath('data.status', 'published')->assertJsonPath('data.can_publish', false);

        $before = app(CourseForAuthoring::class)->handle($course->id)->toArray();
        $this->assertSame('2026-11-12 12:00:00', $course->fresh()->published_at->toDateTimeString());
        $this->assertSame('SQL Fundamentals', $course->fresh()->title);
        $this->putJson("/api/v1/admin/courses/{$course->id}", $this->document(title: 'Changed'))
            ->assertConflict()->assertJsonPath('code', 'COURSES_PUBLISHED');
        $this->putJson("/api/v1/admin/courses/{$course->id}", [])
            ->assertConflict()->assertJsonPath('code', 'COURSES_PUBLISHED');
        Exceptions::fake();
        $this->postJson("/api/v1/admin/courses/{$course->id}/publish")
            ->assertConflict()->assertJsonPath('code', 'COURSES_PUBLISHED');
        // An expected refusal is never reported to the log.
        Exceptions::assertNothingReported();
        $this->assertSame($before, app(CourseForAuthoring::class)->handle($course->id)->toArray());
    }

    public function test_direct_save_action_refuses_a_course_published_since_it_was_read(): void
    {
        $course = $this->completeCourse();
        app(PublishCourse::class)->handle($course->id);
        $before = app(CourseForAuthoring::class)->handle($course->id)->toArray();
        try {
            app(SaveCourseDraft::class)->handle($course->id, $this->document(title: 'Stale edit'));
            $this->fail('A frozen course was saved.');
        } catch (CourseRuleViolation $exception) {
            $this->assertSame('COURSES_PUBLISHED', $exception->errorCode->value);
        }
        $this->assertSame($before, app(CourseForAuthoring::class)->handle($course->id)->toArray());
    }

    /**
     * @return list<array{0: string}>
     */
    public static function incompleteCases(): array
    {
        return array_map(fn (string $case): array => [$case], [
            'title', 'missing stage', 'missing mark', 'zero mark', 'high mark',
            'missing questions', 'blank question', 'one option', 'blank option', 'no correct', 'two correct',
        ]);
    }

    #[DataProvider('incompleteCases')]
    public function test_incomplete_saved_content_disables_publish_and_returns_409(string $case): void
    {
        $this->signedInAdmin();
        $course = $this->completeCourse();
        $stage = $course->stages->first();
        $question = $stage->questions->first();
        match ($case) {
            'title' => $course->update(['title' => '   ']),
            'missing stage' => $stage->delete(),
            'missing mark' => $stage->update(['pass_mark' => null]),
            'zero mark' => $stage->update(['pass_mark' => 0]),
            'high mark' => $stage->update(['pass_mark' => 101]),
            'missing questions' => $question->delete(),
            'blank question' => $question->update(['text' => '  ']),
            'one option' => $question->options->last()->delete(),
            'blank option' => $question->options->last()->update(['text' => '  ']),
            'no correct' => $question->options()->update(['is_correct' => false]),
            'two correct' => $question->options()->update(['is_correct' => true]),
        };

        $this->getJson("/api/v1/admin/courses/{$course->id}")->assertOk()->assertJsonPath('data.can_publish', false);
        $this->postJson("/api/v1/admin/courses/{$course->id}/publish")
            ->assertConflict()->assertExactJson(['message' => 'Complete all three stages before publishing.', 'code' => 'COURSES_INCOMPLETE']);
        $this->assertNull($course->fresh()->published_at);
    }

    public function test_publish_authorization_runs_before_lookup(): void
    {
        $course = $this->completeCourse();
        $this->postJson("/api/v1/admin/courses/{$course->id}/publish")->assertUnauthorized();
        $this->signedInEmployee();
        $this->postJson("/api/v1/admin/courses/{$course->id}/publish")->assertForbidden();
        $this->postJson('/api/v1/admin/courses/999999/publish')->assertForbidden();
        $this->assertNull($course->fresh()->published_at);
        $this->signedInAdmin();
        $this->postJson('/api/v1/admin/courses/999999/publish')->assertNotFound();
        $this->postJson('/api/v1/admin/courses/abc/publish')->assertNotFound();
    }
}
