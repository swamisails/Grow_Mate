<?php

namespace Tests\Feature\Notifications;

use App\Modules\Accounts\Models\User;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;

class InboxTest extends NotificationsTestCase
{
    private function send(User $recipient, string $courseTitle, string $outcome = 'approved'): void
    {
        app(SendNotice::class)->handle($recipient->id, NoticeType::RegistrationDecision, ['course_title' => $courseTitle, 'outcome' => $outcome]);
    }

    public function test_lists_the_employees_own_notices_newest_first_in_the_notice_shape(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $priya = $this->employee('Priya Nair');
        $first = now()->copy();
        $this->send($sam, 'Python Basics');
        $this->travel(1)->days();
        $this->send($priya, 'Git Essentials');
        $this->send($sam, 'SQL Fundamentals', 'refused');
        [$python, , $sql] = array_column($this->storedNotices(), 'id');

        $response = $this->actingAs($sam)->getJson('/api/v1/notices')
            ->assertOk()
            ->assertExactJson(['data' => [
                ['id' => $sql, 'type' => 'registration_decision', 'occurred_at' => now()->toIso8601ZuluString(), 'course_title' => 'SQL Fundamentals', 'outcome' => 'refused'],
                ['id' => $python, 'type' => 'registration_decision', 'occurred_at' => $first->toIso8601ZuluString(), 'course_title' => 'Python Basics', 'outcome' => 'approved'],
            ]]);

        $this->assertMatchesRegularExpression('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/', $response->json('data.0.occurred_at'));
        foreach (['route', 'read_at', 'read', 'count', 'links', 'meta'] as $absent) {
            $this->assertStringNotContainsString("\"{$absent}\"", $response->getContent());
        }
    }

    public function test_notices_sent_within_one_second_list_newest_first_every_time(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $titles = ['Course 1', 'Course 2', 'Course 3', 'Course 4', 'Course 5'];
        foreach ($titles as $title) {
            $this->send($sam, $title);
        }

        $this->actingAs($sam)->getJson('/api/v1/notices')
            ->assertOk()
            ->assertJsonPath('data.*.course_title', array_reverse($titles));
    }

    public function test_with_no_notices_the_list_is_empty(): void
    {
        $this->send($this->employee('Priya Nair'), 'Python Basics');

        $this->actingAs($this->employee('Sam Lindqvist'))->getJson('/api/v1/notices')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_a_guest_is_unauthorized_and_admin_is_forbidden(): void
    {
        $this->getJson('/api/v1/notices')->assertUnauthorized();

        $this->actingAs(User::factory()->admin()->create())->getJson('/api/v1/notices')->assertForbidden();
    }
}
