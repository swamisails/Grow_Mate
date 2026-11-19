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

    /** A Learner requested this Mentor for a Course. Stored for the Mentor, after the Request commits. */
    case RequestSent = 'request_sent';

    /** The Mentor accepted. Stored for the Learner, after the Match commits. */
    case RequestAccepted = 'request_accepted';

    /** A party quit the Match. Stored for the other party, with the quitter's name and the reason. */
    case MatchQuit = 'match_quit';

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
            self::RequestSent, self::RequestAccepted => ['person_name', 'course_title'],
            self::MatchQuit => ['person_name', 'course_title', 'reason'],
            self::RequestReminderDay3, self::RequestCancelledDay6 => ['party', 'person_name', 'course_title'],
        };
    }
}
