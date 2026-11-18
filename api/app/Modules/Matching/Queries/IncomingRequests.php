<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Matching\Models\Request;

/**
 * The pending Requests addressed to one Employee, oldest id first (AD-4). A group is not listed:
 * this entry does not accept one. Accepted Requests are not listed.
 */
class IncomingRequests
{
    public function __construct(
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
    ) {}

    /**
     * @return list<array{id: int, learner_name: string, course_title: string}>
     */
    public function handle(int $mentorId): array
    {
        $rows = Request::query()
            ->where('mentor_id', $mentorId)
            ->whereNull('accepted_at')
            ->whereNull('group_assignment_id')
            ->orderBy('id')
            ->get(['id', 'learner_id', 'course_id']);

        $names = $this->userNames->handle($rows->pluck('learner_id')->map(fn ($id): int => (int) $id)->all());
        $titles = $this->courseTitles->handle($rows->pluck('course_id')->map(fn ($id): int => (int) $id)->all());

        $requests = [];
        foreach ($rows as $row) {
            $name = $names[(int) $row->learner_id] ?? null;
            $title = $titles[(int) $row->course_id] ?? null;
            if ($name === null || $title === null) {
                continue;
            }
            $requests[] = ['id' => (int) $row->id, 'learner_name' => $name, 'course_title' => $title];
        }

        return $requests;
    }
}
