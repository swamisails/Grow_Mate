<?php

namespace Tests\Feature\Matching;

use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Mentors\Models\MentorRoute;

class GroupClockTest extends GroupAssignmentTestCase
{
    public function test_on_day_3_every_learner_and_the_chosen_employee_per_learner_are_reminded_and_the_row_stays(): void
    {
        $this->assign()->assertCreated();
        $requests = Request::query()->orderBy('id')->get();

        $this->travelTo(now()->addHours(72));

        $occurredAt = '2026-11-21T09:00:00Z';
        foreach ($this->learners as $learner) {
            $request = $requests->firstWhere('learner_id', $learner->id);
            $notices = $this->actingAs($learner)->getJson('/api/v1/notices');
            $notices->assertOk()->assertExactJson(['data' => [[
                'id' => 'request_reminder_day3:'.$request->id,
                'type' => 'request_reminder_day3',
                'occurred_at' => $occurredAt,
                'party' => 'learner',
                'person_name' => 'Imani Okafor',
                'course_title' => 'SQL Fundamentals',
            ]]]);
            $this->assertHidesRouteAndGroup($notices);
        }

        $inbox = $this->actingAs($this->imani)->getJson('/api/v1/notices')->assertOk();
        $this->assertHidesRouteAndGroup($inbox);
        $reminders = array_values(array_filter($inbox->json('data'), fn (array $notice): bool => $notice['type'] === 'request_reminder_day3'));
        $this->assertEqualsCanonicalizing(
            $requests->map(fn (Request $request): string => 'request_reminder_day3:'.$request->id)->all(),
            array_column($reminders, 'id'),
        );
        $this->assertEqualsCanonicalizing(
            ['Asha Rao', 'Ben Carter', 'Chloe Dubois', 'Dev Patel', 'Elena Ruiz'],
            array_column($reminders, 'person_name'),
        );
        $this->assertSame(array_fill(0, 5, 'mentor'), array_column($reminders, 'party'));

        $this->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => [[
            'id' => $requests->first()->id,
            'learner_names' => ['Asha Rao', 'Ben Carter', 'Chloe Dubois', 'Dev Patel', 'Elena Ruiz'],
            'course_title' => 'SQL Fundamentals',
        ]]]);
    }

    public function test_on_day_6_the_group_is_cancelled_together_and_grants_nothing(): void
    {
        config(['app.debug' => false]);
        $this->assign()->assertCreated();
        $requests = Request::query()->orderBy('id')->get();

        $this->travelTo(now()->addHours(144));

        $occurredAt = '2026-11-24T09:00:00Z';
        foreach ($this->learners as $learner) {
            $request = $requests->firstWhere('learner_id', $learner->id);
            $notices = $this->actingAs($learner)->getJson('/api/v1/notices')->assertOk();
            $this->assertHidesRouteAndGroup($notices);
            $this->assertContains([
                'id' => 'request_cancelled_day6:'.$request->id,
                'type' => 'request_cancelled_day6',
                'occurred_at' => $occurredAt,
                'party' => 'learner',
                'person_name' => 'Imani Okafor',
                'course_title' => 'SQL Fundamentals',
            ], $notices->json('data'));
        }

        $this->actingAs($this->imani);
        $inbox = $this->getJson('/api/v1/notices')->assertOk();
        $this->assertHidesRouteAndGroup($inbox);
        $cancellations = array_values(array_filter($inbox->json('data'), fn (array $notice): bool => $notice['type'] === 'request_cancelled_day6'));
        $this->assertEqualsCanonicalizing(
            $requests->map(fn (Request $request): string => 'request_cancelled_day6:'.$request->id)->all(),
            array_column($cancellations, 'id'),
        );
        $this->assertSame(array_fill(0, 5, 'mentor'), array_column($cancellations, 'party'));

        $this->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => []]);
        foreach ($requests as $request) {
            $this->postJson("/api/v1/requests/{$request->id}/accept")
                ->assertNotFound()
                ->assertExactJson(['message' => 'Not found.']);
        }

        $this->assertSame(5, Request::query()->whereNull('accepted_at')->count());
        $this->assertSame(0, MentorMatch::query()->count());
        $this->assertSame(0, MentorRoute::query()->count());
        $this->actingAs($this->learners[0])->getJson("/api/v1/courses/{$this->sql->id}/mentors")
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_after_144_hours_the_group_row_is_gone(): void
    {
        $this->assign()->assertCreated();

        $this->travelTo(now()->addHours(143)->addMinutes(59));
        $this->assertCount(1, $this->actingAs($this->imani)->getJson('/api/v1/requests')->json('data'));

        $this->travelTo(now()->addMinute());
        $this->actingAs($this->imani)->getJson('/api/v1/requests')->assertOk()->assertExactJson(['data' => []]);
    }
}
