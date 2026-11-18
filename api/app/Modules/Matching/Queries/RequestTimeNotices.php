<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Accounts\Queries\EmployeeNotifiable;
use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Matching\Models\Request;
use App\Modules\Notifications\NoticeType;
use App\Modules\Notifications\Queries\TimeNoticeSource;
use Illuminate\Support\Carbon;

/**
 * Day-3 and day-6 notices for one Employee, derived from RequestState. Each party gets their own
 * row. Ids are `<type>:<request_id>`. Dates are the rule instants, not `now()`. Nothing is written.
 */
class RequestTimeNotices implements TimeNoticeSource
{
    public function __construct(
        private readonly RequestState $requestState,
        private readonly EmployeeNotifiable $employeeNotifiable,
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
    ) {}

    /**
     * @return list<array{id: string, type: NoticeType, occurred_at: Carbon, fields: array<string, mixed>}>
     */
    public function handle(int $userId): array
    {
        // Admin is never a recipient (AD-11), including when a Request names them.
        if ($this->employeeNotifiable->handle($userId) === null) {
            return [];
        }

        $rows = Request::query()
            ->where(function ($query) use ($userId): void {
                $query->where('learner_id', $userId)->orWhere('mentor_id', $userId);
            })
            ->orderBy('id')
            ->get(['id', 'learner_id', 'mentor_id', 'course_id', 'sent_at', 'accepted_at']);

        $otherIds = [];
        $courseIds = [];
        foreach ($rows as $row) {
            $otherIds[] = (int) $row->learner_id === $userId ? (int) $row->mentor_id : (int) $row->learner_id;
            $courseIds[] = (int) $row->course_id;
        }

        $names = $this->userNames->handle($otherIds);
        $titles = $this->courseTitles->handle($courseIds);

        $notices = [];
        foreach ($rows as $row) {
            $otherId = (int) $row->learner_id === $userId ? (int) $row->mentor_id : (int) $row->learner_id;
            $name = $names[$otherId] ?? null;
            $title = $titles[(int) $row->course_id] ?? null;
            if ($name === null || $title === null) {
                continue;
            }

            $fields = [
                'party' => (int) $row->learner_id === $userId ? 'learner' : 'mentor',
                'person_name' => $name,
                'course_title' => $title,
            ];

            if ($this->requestState->reminderReached($row)) {
                $notices[] = $this->notice($row, NoticeType::RequestReminderDay3, RequestState::REMIND_HOURS, $fields);
            }
            if ($this->requestState->isCancelled($row)) {
                $notices[] = $this->notice($row, NoticeType::RequestCancelledDay6, RequestState::CANCEL_HOURS, $fields);
            }
        }

        return $notices;
    }

    /**
     * @param  array{party: string, person_name: string, course_title: string}  $fields
     * @return array{id: string, type: NoticeType, occurred_at: Carbon, fields: array{party: string, person_name: string, course_title: string}}
     */
    private function notice(Request $request, NoticeType $type, int $hours, array $fields): array
    {
        return [
            'id' => $type->value.':'.$request->id,
            'type' => $type,
            'occurred_at' => $request->sent_at->copy()->utc()->addHours($hours),
            'fields' => $fields,
        ];
    }
}
