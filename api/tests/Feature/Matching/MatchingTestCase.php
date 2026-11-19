<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Actions\GrantMentor;
use App\Modules\Mentors\Models\Route;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Tests\Feature\ApiTestCase;

abstract class MatchingTestCase extends ApiTestCase
{
    protected function publishedCourse(string $title = 'Python Basics'): Course
    {
        return Course::factory()->published()->create(['title' => $title]);
    }

    protected function employee(string $name): User
    {
        return User::factory()->create(['name' => $name]);
    }

    protected function grant(User $user, Course $course, Route $route = Route::RegistrationApproval): void
    {
        app(GrantMentor::class)->handle($user->id, $course->id, $route);
    }

    /**
     * A pending one-to-one Request, sent now unless `$sentAt` says otherwise.
     */
    protected function openRequest(User $learner, User $mentor, Course $course, ?Carbon $sentAt = null): Request
    {
        return Request::factory()->create([
            'learner_id' => $learner->id,
            'mentor_id' => $mentor->id,
            'course_id' => $course->id,
            'sent_at' => $sentAt ?? now(),
            'accepted_at' => null,
            'group_assignment_id' => null,
        ]);
    }

    /**
     * Priya's Request to Rafi, Mentor of a new Course, accepted through the API: a live Match.
     *
     * @return array{0: User, 1: User, 2: Course, 3: MentorMatch}
     */
    protected function liveMatch(): array
    {
        $course = $this->publishedCourse();
        $priya = $this->employee('Priya Nair');
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $course);
        $request = $this->openRequest($priya, $rafi, $course);
        $this->actingAs($rafi)->postJson("/api/v1/requests/{$request->id}/accept")->assertCreated();

        return [$priya, $rafi, $course, MentorMatch::query()->where('request_id', $request->id)->firstOrFail()];
    }

    protected function assertHidesRouteAndGroup(TestResponse $response): void
    {
        $body = $response->getContent();
        $this->assertStringNotContainsString('group_assignment_id', $body);
        // `can_request` is a real field; a Mentor route would be the key `"route"`.
        $this->assertStringNotContainsString('"route"', $body);
        $this->assertStringNotContainsString('gold_pass', $body);
        $this->assertStringNotContainsString('registration_approval', $body);
        $this->assertStringNotContainsString('group_assignment_accepted', $body);
    }
}
