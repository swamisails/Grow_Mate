<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Matching\Models\Request;

/**
 * The pending Requests addressed to one Employee, oldest id first (AD-4). Accepted Requests are
 * not listed. A Request at or after `sent_at` + 144 hours is cancelled and dropped. Day 3 does not
 * change the list. A group assignment's pending Requests are one row, named in Request order, with
 * the group's lowest Request id; only the chosen Employee ever sees that the Requests came together
 * (AD-8).
 */
class IncomingRequests
{
    public function __construct(
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
    ) {}

    /**
     * @return list<array{id: int, learner_name: string, course_title: string}|array{id: int, learner_names: list<string>, course_title: string}>
     */
    public function handle(int $mentorId): array
    {
        $rows = Request::query()
            ->where('mentor_id', $mentorId)
            ->whereNull('accepted_at')
            ->where('sent_at', '>', now()->copy()->subHours(RequestState::CANCEL_HOURS))
            ->orderBy('id')
            ->get(['id', 'learner_id', 'course_id', 'group_assignment_id']);

        $names = $this->userNames->handle($rows->pluck('learner_id')->map(fn ($id): int => (int) $id)->unique()->values()->all());
        $titles = $this->courseTitles->handle($rows->pluck('course_id')->map(fn ($id): int => (int) $id)->unique()->values()->all());

        /** @var array<string, array{id: int, learner_names: list<string>, course_title: string}|array{id: int, learner_name: string, course_title: string}> $requests */
        $requests = [];
        foreach ($rows as $row) {
            $name = $names[(int) $row->learner_id] ?? null;
            $title = $titles[(int) $row->course_id] ?? null;
            if ($name === null || $title === null) {
                continue;
            }

            if ($row->group_assignment_id === null) {
                $requests['request:'.$row->id] = ['id' => (int) $row->id, 'learner_name' => $name, 'course_title' => $title];

                continue;
            }

            // Rows come in id order, so the first one seen is the group's lowest id and the names
            // follow Request order.
            $key = 'group:'.$row->group_assignment_id;
            if (! isset($requests[$key])) {
                $requests[$key] = ['id' => (int) $row->id, 'learner_names' => [], 'course_title' => $title];
            }
            $requests[$key]['learner_names'][] = $name;
        }

        return array_values($requests);
    }
}
