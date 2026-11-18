<?php

namespace App\Modules\Notifications\Actions;

use App\Modules\Accounts\Queries\EmployeeNotifiable;
use App\Modules\Notifications\Notices\EventNotice;
use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use LogicException;

class SendNotice
{
    public function __construct(private readonly EmployeeNotifiable $employeeNotifiable) {}

    /**
     * Sends one event notice to an Employee (AD-11), the only writer of `notifications`. The notice is
     * stored through Laravel's database channel once the caller's transaction commits, so a caller
     * calls this inside its own transaction and a rolled-back caller sends nothing. Outside any
     * transaction it is stored at once.
     *
     * @param  array<string, string|int|bool|null>  $fields  exactly the type's fields (NoticeType::fields())
     *
     * @throws LogicException when the recipient is Admin or no user (Admin is never a recipient,
     *                        AD-11), the type is derived from a Request and never stored, or the
     *                        fields aren't the type's. Nothing is stored.
     */
    public function handle(int $recipientId, NoticeType $type, array $fields): void
    {
        if ($type === NoticeType::RequestReminderDay3 || $type === NoticeType::RequestCancelledDay6) {
            throw new LogicException("A {$type->value} notice is derived from the Request and is never stored.");
        }

        $expected = $type->fields();
        $given = array_keys($fields);
        sort($expected);
        sort($given);
        if ($given !== $expected) {
            throw new LogicException("A {$type->value} notice carries exactly: ".implode(', ', $type->fields()).'.');
        }

        $recipient = $this->employeeNotifiable->handle($recipientId);
        if ($recipient === null) {
            throw new LogicException("User {$recipientId} is not an Employee; only Employees receive notices.");
        }

        $notice = new EventNotice($type, $fields);
        DB::afterCommit(fn () => Notification::sendNow($recipient, $notice));
    }
}
