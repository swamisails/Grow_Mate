<?php

namespace Tests\Feature\Notifications;

use App\Modules\Accounts\Models\User;
use App\Modules\Notifications\Actions\SendNotice;
use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LogicException;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;

class SendNoticeTest extends NotificationsTestCase
{
    /**
     * @param  array<string, string>  $fields
     */
    private function send(User $recipient, array $fields = ['course_title' => 'Python Basics', 'outcome' => 'approved']): void
    {
        app(SendNotice::class)->handle($recipient->id, NoticeType::RegistrationDecision, $fields);
    }

    public function test_stores_one_database_notice_with_a_uuid7_id_the_type_and_its_fields(): void
    {
        $sam = $this->employee('Sam Lindqvist');

        $this->send($sam);

        [$notice] = $this->storedNotices();
        $this->assertTrue(Str::isUuid($notice->id, 7));
        $this->assertSame('registration_decision', $notice->type);
        $this->assertSame([$sam->getMorphClass(), $sam->id], [$notice->notifiable_type, (int) $notice->notifiable_id]);
        $this->assertSame(['course_title' => 'Python Basics', 'outcome' => 'approved'], json_decode($notice->data, true));
        $this->assertNull($notice->read_at);
        $this->assertSame(now()->toDateTimeString(), $notice->created_at);
    }

    public function test_inside_a_transaction_the_notice_is_stored_only_once_it_commits(): void
    {
        $sam = $this->employee('Sam Lindqvist');

        DB::transaction(function () use ($sam): void {
            $this->send($sam);
            $this->assertDatabaseCount('notifications', 0);
        });

        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_a_rolled_back_caller_sends_nothing(): void
    {
        $sam = $this->employee('Sam Lindqvist');

        try {
            DB::transaction(function () use ($sam): void {
                $this->send($sam);
                throw new RuntimeException('The caller fails after sending.');
            });
            $this->fail('Expected the caller to fail.');
        } catch (RuntimeException) {
        }

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_admin_is_never_a_recipient(): void
    {
        $admin = User::factory()->admin()->create();

        try {
            $this->send($admin);
            $this->fail('Expected a LogicException.');
        } catch (LogicException) {
        }

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_a_derived_request_notice_is_never_stored(): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $fields = ['party' => 'learner', 'person_name' => 'Rafi Haddad', 'course_title' => 'Python Basics'];

        foreach ([NoticeType::RequestReminderDay3, NoticeType::RequestCancelledDay6] as $type) {
            try {
                app(SendNotice::class)->handle($sam->id, $type, $fields);
                $this->fail("Expected a {$type->value} notice to be refused.");
            } catch (LogicException) {
            }
        }

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_an_unknown_recipient_is_refused(): void
    {
        $this->expectException(LogicException::class);

        try {
            app(SendNotice::class)->handle(999, NoticeType::RegistrationDecision, ['course_title' => 'Python Basics', 'outcome' => 'approved']);
        } finally {
            $this->assertDatabaseCount('notifications', 0);
        }
    }

    /**
     * @return array<string, array{0: array<string, string>}>
     */
    public static function wrongFields(): array
    {
        return [
            'a hidden field' => [['course_title' => 'Python Basics', 'outcome' => 'approved', 'route' => 'registration_approval']],
            'a missing field' => [['course_title' => 'Python Basics']],
            'no fields' => [[]],
        ];
    }

    /**
     * @param  array<string, string>  $fields
     */
    #[DataProvider('wrongFields')]
    public function test_a_notice_carries_exactly_its_types_fields(array $fields): void
    {
        $sam = $this->employee('Sam Lindqvist');
        $this->expectException(LogicException::class);

        try {
            $this->send($sam, $fields);
        } finally {
            $this->assertDatabaseCount('notifications', 0);
        }
    }
}
