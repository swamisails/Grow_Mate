<?php

namespace Tests\Feature\Matching;

use App\Modules\Accounts\Models\User;
use App\Modules\Courses\Models\Course;
use App\Modules\Matching\Models\GroupAssignment;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Models\MentorRoute;
use App\Modules\Mentors\Models\RegistrationDecision;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;

class GroupRefusalsTest extends GroupAssignmentTestCase
{
    public function test_a_draft_course_is_refused_and_nothing_is_created(): void
    {
        $draft = Course::factory()->create(['title' => 'Draft Course']);

        $response = $this->assign(['course_id' => $draft->id]);

        $response->assertConflict()->assertExactJson([
            'message' => "This course isn't published.",
            'code' => 'MATCHING_COURSE_NOT_PUBLISHED',
        ]);
        $this->assertNothingCreated();
    }

    /**
     * @return array{group_assignments: int, requests: int, matches: int, notifications: int, mentor_routes: int}
     */
    private function counts(): array
    {
        return [
            'group_assignments' => GroupAssignment::query()->count(),
            'requests' => Request::query()->count(),
            'matches' => MentorMatch::query()->count(),
            'notifications' => $this->getConnection()->table('notifications')->count(),
            'mentor_routes' => MentorRoute::query()->count(),
        ];
    }

    /**
     * Assigns, expecting a refusal that leaves every table as it was. Returns the response.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function assignRefused(array $overrides = []): TestResponse
    {
        $before = $this->counts();
        Exceptions::fake();

        $response = $this->assign($overrides);

        Exceptions::assertNothingReported();
        $this->assertSame($before, $this->counts());
        $this->assertHidesRouteAndGroup($response);

        return $response;
    }

    /**
     * Puts the Learner in the state for one R7 reason on SQL Fundamentals, through another Mentor.
     */
    private function makeIneligible(User $learner, string $reason): void
    {
        $rafi = User::query()->where('name', 'Rafi Haddad')->first() ?? $this->employee('Rafi Haddad');
        if ($reason === 'already a mentor') {
            $this->grant($learner, $this->sql);

            return;
        }

        $request = Request::factory()->create([
            'learner_id' => $learner->id,
            'mentor_id' => $rafi->id,
            'course_id' => $this->sql->id,
            'sent_at' => now(),
            'accepted_at' => $reason === 'open request' ? null : now(),
        ]);
        match ($reason) {
            'open request' => null,
            'live match' => MentorMatch::factory()->create(['request_id' => $request->id]),
            'course completed' => MentorMatch::factory()->courseCompleted()->create(['request_id' => $request->id]),
        };
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function r7Reasons(): array
    {
        return [
            'open request' => ['open request'],
            'live match' => ['live match'],
            'course completed' => ['course completed'],
            'already a mentor' => ['already a mentor'],
        ];
    }

    private function refuseAtRegistration(User $employee, Course $course): void
    {
        RegistrationDecision::factory()->refused()->create(['user_id' => $employee->id, 'course_id' => $course->id]);
    }

    public function test_a_chosen_employee_refused_the_course_at_registration_is_refused_and_nothing_is_created(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $this->refuseAtRegistration($sam, $this->sql);

        $response = $this->assignRefused(['mentor_id' => $sam->id]);

        $response->assertConflict()->assertExactJson([
            'message' => "This employee can't be chosen for this course.",
            'code' => 'MATCHING_MENTOR_NOT_ELIGIBLE',
            'errors' => ['mentor_id' => ["This employee can't be chosen for this course."]],
        ]);
        $this->assertNothingCreated();
    }

    public function test_a_refusal_on_another_course_or_an_approval_does_not_stop_the_chosen_employee(): void
    {
        $this->refuseAtRegistration($this->imani, $this->publishedCourse('Python Basics'));
        RegistrationDecision::factory()->create(['user_id' => $this->imani->id, 'course_id' => $this->sql->id]);

        $this->assign()->assertCreated();
        $this->assertSame(5, Request::query()->count());
    }

    public function test_the_chosen_employee_as_a_learner_is_a_422_on_learner_ids(): void
    {
        $learnerIds = array_map(fn (User $learner): int => $learner->id, $this->learners);

        $response = $this->assignRefused(['learner_ids' => [$learnerIds[0], $this->imani->id]]);

        $response->assertUnprocessable()->assertOnlyJsonValidationErrors(['learner_ids']);
        $this->assertSame(["The chosen employee can't also be a learner."], $response->json('errors.learner_ids'));
        $this->assertNothingCreated();
    }

    public function test_a_learner_with_a_live_match_refuses_the_whole_group_and_marks_only_that_learner(): void
    {
        [$asha, $ben, $chloe] = $this->learners;
        $this->makeIneligible($ben, 'live match');

        $response = $this->assignRefused(['learner_ids' => [$asha->id, $ben->id, $chloe->id]]);

        $response->assertConflict()->assertExactJson([
            'message' => "Nothing was assigned. Some learners can't be assigned to this course.",
            'code' => 'MATCHING_LEARNER_NOT_ASSIGNABLE',
            'errors' => ['learner_ids.1' => ["This learner can't be assigned to this course."]],
        ]);
        $this->assertSame(0, GroupAssignment::query()->count());
        $this->assertSame(1, Request::query()->count());
    }

    #[DataProvider('r7Reasons')]
    public function test_every_r7_reason_gives_the_same_body_naming_no_reason(string $reason): void
    {
        $this->makeIneligible($this->learners[1], $reason);
        $this->makeIneligible($this->learners[3], $reason);

        $response = $this->assignRefused();

        $response->assertConflict()->assertExactJson([
            'message' => "Nothing was assigned. Some learners can't be assigned to this course.",
            'code' => 'MATCHING_LEARNER_NOT_ASSIGNABLE',
            'errors' => [
                'learner_ids.1' => ["This learner can't be assigned to this course."],
                'learner_ids.3' => ["This learner can't be assigned to this course."],
            ],
        ]);
        $this->assertSame(0, GroupAssignment::query()->count());
    }

    public function test_a_learner_who_sent_their_own_request_first_refuses_the_assignment(): void
    {
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $this->sql);
        $asha = $this->learners[0];
        $this->actingAs($asha)->postJson("/api/v1/courses/{$this->sql->id}/requests", ['mentor_id' => $rafi->id])->assertCreated();

        $response = $this->assignRefused(['learner_ids' => [$asha->id]]);

        $response->assertConflict()->assertExactJson([
            'message' => "Nothing was assigned. Some learners can't be assigned to this course.",
            'code' => 'MATCHING_LEARNER_NOT_ASSIGNABLE',
            'errors' => ['learner_ids.0' => ["This learner can't be assigned to this course."]],
        ]);
        $this->assertSame(1, Request::query()->where('learner_id', $asha->id)->count());
        $this->assertSame(0, GroupAssignment::query()->count());
    }

    public function test_a_learner_assigned_first_cannot_send_their_own_request(): void
    {
        $rafi = $this->employee('Rafi Haddad');
        $this->grant($rafi, $this->sql);
        $asha = $this->learners[0];
        $this->assign(['learner_ids' => [$asha->id]])->assertCreated();

        $own = $this->actingAs($asha)->postJson("/api/v1/courses/{$this->sql->id}/requests", ['mentor_id' => $rafi->id]);

        $own->assertConflict()->assertExactJson([
            'message' => 'You already have an open request for this course.',
            'code' => 'MATCHING_REQUEST_ALREADY_OPEN',
        ]);
        $this->assertSame(1, Request::query()->where('learner_id', $asha->id)->count());
    }

    public function test_the_checks_run_in_order_employees_draft_chosen_employee_then_learners(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $draft = Course::factory()->create(['title' => 'Draft Course']);
        $this->refuseAtRegistration($sam, $this->sql);
        $this->refuseAtRegistration($sam, $draft);
        $this->makeIneligible($this->learners[0], 'open request');
        $learnerIds = array_map(fn (User $learner): int => $learner->id, $this->learners);

        $this->assignRefused(['mentor_id' => $sam->id, 'learner_ids' => [...$learnerIds, 999999]])
            ->assertUnprocessable()
            ->assertOnlyJsonValidationErrors(['learner_ids']);
        $this->assignRefused(['course_id' => $draft->id, 'mentor_id' => $sam->id])
            ->assertConflict()
            ->assertJsonPath('code', 'MATCHING_COURSE_NOT_PUBLISHED');
        $this->assignRefused(['mentor_id' => $sam->id])
            ->assertConflict()
            ->assertJsonPath('code', 'MATCHING_MENTOR_NOT_ELIGIBLE');
        $this->assignRefused()
            ->assertConflict()
            ->assertJsonPath('code', 'MATCHING_LEARNER_NOT_ASSIGNABLE');
    }

    public function test_an_empty_learner_list_is_a_422_on_learner_ids(): void
    {
        $this->assign(['learner_ids' => []])->assertUnprocessable()->assertOnlyJsonValidationErrors(['learner_ids']);
        $this->assertNothingCreated();
    }

    public function test_an_unknown_or_admin_id_is_a_422_on_its_field(): void
    {
        $learnerIds = array_map(fn (User $learner): int => $learner->id, $this->learners);

        $this->assign(['mentor_id' => 999999])->assertUnprocessable()->assertOnlyJsonValidationErrors(['mentor_id']);
        $this->assign(['mentor_id' => $this->noor->id])->assertUnprocessable()->assertOnlyJsonValidationErrors(['mentor_id']);
        $this->assign(['learner_ids' => [...$learnerIds, 999999]])->assertUnprocessable()->assertOnlyJsonValidationErrors(['learner_ids']);
        $this->assign(['learner_ids' => [$learnerIds[0], $this->noor->id]])->assertUnprocessable()->assertOnlyJsonValidationErrors(['learner_ids']);
        $this->assign(['course_id' => 999999])->assertUnprocessable()->assertOnlyJsonValidationErrors(['course_id']);
        $this->assign(['learner_ids' => [$learnerIds[0], $learnerIds[0]]])->assertUnprocessable()->assertJsonValidationErrors(['learner_ids.1']);
        $this->assign(['course_id' => (string) $this->sql->id])->assertUnprocessable()->assertOnlyJsonValidationErrors(['course_id']);

        $this->assertNothingCreated();
    }

    public function test_an_employee_or_a_guest_cannot_assign(): void
    {
        $this->postJson('/api/v1/admin/group-assignments', [])->assertUnauthorized();

        $this->actingAs($this->imani)->postJson('/api/v1/admin/group-assignments', [
            'course_id' => $this->sql->id,
            'mentor_id' => $this->imani->id,
            'learner_ids' => [$this->learners[0]->id],
        ])->assertForbidden();

        $this->assertNothingCreated();
    }
}
