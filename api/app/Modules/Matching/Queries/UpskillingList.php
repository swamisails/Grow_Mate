<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Matching\Models\Request;
use App\Modules\Progress\Queries\ProgressStatus;

/**
 * The Upskilling list: one row per Employee and Course where Progress says `in_progress`, sorted by
 * name then Course title. Names and titles only: no Request or Match ids, Mentors or routes (C4, C6).
 */
class UpskillingList
{
    public function __construct(
        private readonly ProgressStatus $progressStatus,
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
    ) {}

    /**
     * @return list<array{person_name: string, course_title: string, status: 'in_progress'}>
     */
    public function handle(): array
    {
        $pairs = Request::query()->toBase()->distinct()->get(['learner_id', 'course_id']);

        if ($pairs->isEmpty()) {
            return [];
        }

        $names = $this->userNames->handle($pairs->pluck('learner_id')->map(fn ($id): int => (int) $id)->unique()->values()->all());
        $titles = $this->courseTitles->handle($pairs->pluck('course_id')->map(fn ($id): int => (int) $id)->unique()->values()->all());

        $rows = [];
        foreach ($pairs as $pair) {
            $learnerId = (int) $pair->learner_id;
            $courseId = (int) $pair->course_id;
            $name = $names[$learnerId] ?? null;
            $title = $titles[$courseId] ?? null;
            if ($name === null || $title === null || $this->progressStatus->handle($learnerId, $courseId) !== 'in_progress') {
                continue;
            }
            $rows[] = ['person_name' => $name, 'course_title' => $title, 'status' => 'in_progress', 'learner_id' => $learnerId, 'course_id' => $courseId];
        }

        usort($rows, fn (array $a, array $b): int => strcasecmp($a['person_name'], $b['person_name'])
            ?: strcasecmp($a['course_title'], $b['course_title'])
            ?: $a['learner_id'] <=> $b['learner_id']
            ?: $a['course_id'] <=> $b['course_id']);

        return array_map(fn (array $row): array => [
            'person_name' => $row['person_name'],
            'course_title' => $row['course_title'],
            'status' => 'in_progress',
        ], $rows);
    }
}
