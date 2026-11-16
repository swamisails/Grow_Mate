<?php

namespace App\Modules\Notifications;

/**
 * Every event notice type (R22, AD-11), stored as the `notifications.type` value. Closed: a new
 * type is added here, with its fields, by the entry that sends it.
 */
enum NoticeType: string
{
    /** Admin's Registration decision on a Course the Employee named in their Mentor check (R3). */
    case RegistrationDecision = 'registration_decision';

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
        };
    }
}
