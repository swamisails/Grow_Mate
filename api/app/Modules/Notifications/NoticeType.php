<?php

namespace App\Modules\Notifications;

/**
 * Every notice type (R22, AD-11). Stored types use this as `notifications.type`. The two Request
 * time notices are derived on read; `SendNotice` refuses to store them. Closed: a new type is
 * added here, with its fields, by the entry that introduces it.
 */
enum NoticeType: string
{
    /** Admin's Registration decision on a Course the Employee named in their Mentor check (R3). */
    case RegistrationDecision = 'registration_decision';

    /** Day 3: the Request was still open at `sent_at` + 72 hours. One row per party, never stored. */
    case RequestReminderDay3 = 'request_reminder_day3';

    /** Day 6: the Request is cancelled at `sent_at` + 144 hours. One row per party, never stored. */
    case RequestCancelledDay6 = 'request_cancelled_day6';

    /**
     * The type's fields, exactly: every notice of the type carries these keys and no others, so a
     * hidden field such as a Mentor route can never ride along (AD-8).
     *
     * @return list<string>
     */
    public function fields(): array
    {
        return match ($this) {
            self::RegistrationDecision => ['course_title', 'outcome'],
            self::RequestReminderDay3, self::RequestCancelledDay6 => ['party', 'person_name', 'course_title'],
        };
    }
}
