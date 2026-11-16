<?php

namespace App\Modules\Notifications\Notices;

use App\Modules\Notifications\NoticeType;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * One stored event notice (AD-11): sent only by `SendNotice`, through the database channel only.
 * Its id is a UUIDv7, so ids order notices created in the same second.
 */
class EventNotice extends Notification
{
    /**
     * @param  array<string, string|int|bool|null>  $fields  the type's fields (NoticeType::fields())
     */
    public function __construct(
        public readonly NoticeType $noticeType,
        public readonly array $fields,
    ) {
        // Time-ordered to the millisecond, and monotonic within this process.
        $this->id = (string) Str::uuid7();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** The stored `type`: the `NoticeType` value, never a class name. */
    public function databaseType(object $notifiable): string
    {
        return $this->noticeType->value;
    }

    /**
     * @return array<string, string|int|bool|null>
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->fields;
    }
}
