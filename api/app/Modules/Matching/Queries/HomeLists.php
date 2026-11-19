<?php

namespace App\Modules\Matching\Queries;

use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\CourseTitles;
use App\Modules\Matching\Models\MentorMatch;
use App\Modules\Matching\Models\Request;
use App\Modules\Progress\Queries\ProgressStatus;
use Illuminate\Support\Collection;

/**
 * Home's Learning and Mentoring lists for one Employee. Learning is one row per Course where
 * Progress has a status, newest accepted Match when that status is in progress. Mentoring is one
 * row per live Match the Employee mentors. A Match row is the live pairing; nothing here has ended.
 */
class HomeLists
{
    public function __construct(
        private readonly ProgressStatus $progressStatus,
        private readonly RequestState $requestState,
        private readonly UserNames $userNames,
        private readonly CourseTitles $courseTitles,
    ) {}

    /**
     * @return array{
     *     learning: list<array{course_id: int, course_title: string, status: 'not_yet_started'|'in_progress'|'quit', match_id: int|null}>,
     *     mentoring: list<array{id: int, person_name: string, course_title: string}>
     * }
     */
    public function handle(int $userId): array
    {
        return [
            'learning' => $this->learning($userId),
            'mentoring' => $this->mentoring($userId),
        ];
    }

    /**
     * @return list<array{course_id: int, course_title: string, status: 'not_yet_started'|'in_progress'|'quit', match_id: int|null}>
     */
    private function learning(int $learnerId): array
    {
        $requests = Request::query()
            ->where('learner_id', $learnerId)
            ->orderBy('id')
            ->get(['id', 'course_id', 'sent_at', 'accepted_at']);

        if ($requests->isEmpty()) {
            return [];
        }

        $courseIds = $requests->pluck('course_id')->map(fn ($id): int => (int) $id)->unique()->values()->all();
        $titles = $this->courseTitles->handle($courseIds);
        $matchIdByRequest = $this->matchIdByRequest($requests->pluck('id')->map(fn ($id): int => (int) $id)->all());

        $rows = [];
        foreach ($courseIds as $courseId) {
            $status = $this->progressStatus->handle($learnerId, $courseId);
            $title = $titles[$courseId] ?? null;
            if ($status === null || $title === null) {
                continue;
            }

            $rows[] = [
                'course_id' => $courseId,
                'course_title' => $title,
                'status' => $status,
                'match_id' => $status === 'in_progress' ? $this->newestMatchId($requests, $courseId, $matchIdByRequest) : null,
            ];
        }

        usort($rows, fn (array $a, array $b): int => strcasecmp($a['course_title'], $b['course_title']) ?: $a['course_id'] <=> $b['course_id']);

        return $rows;
    }

    /**
     * @return list<array{id: int, person_name: string, course_title: string}>
     */
    private function mentoring(int $mentorId): array
    {
        $matches = MentorMatch::query()
            ->join('requests', 'requests.id', '=', 'matches.request_id')
            ->where('requests.mentor_id', $mentorId)
            ->whereNull('matches.ended_at')
            ->toBase()
            ->get(['matches.id as id', 'requests.learner_id as learner_id', 'requests.course_id as course_id']);

        if ($matches->isEmpty()) {
            return [];
        }

        $names = $this->userNames->handle($matches->pluck('learner_id')->map(fn ($id): int => (int) $id)->unique()->values()->all());
        $titles = $this->courseTitles->handle($matches->pluck('course_id')->map(fn ($id): int => (int) $id)->unique()->values()->all());

        $rows = [];
        foreach ($matches as $match) {
            $name = $names[(int) $match->learner_id] ?? null;
            $title = $titles[(int) $match->course_id] ?? null;
            if ($name === null || $title === null) {
                continue;
            }
            $rows[] = ['id' => (int) $match->id, 'person_name' => $name, 'course_title' => $title];
        }

        usort($rows, fn (array $a, array $b): int => strcasecmp($a['person_name'], $b['person_name'])
            ?: strcasecmp($a['course_title'], $b['course_title'])
            ?: $a['id'] <=> $b['id']);

        return $rows;
    }

    /**
     * @param  list<int>  $requestIds
     * @return array<int, int>
     */
    private function matchIdByRequest(array $requestIds): array
    {
        $matchIdByRequest = [];
        foreach (MentorMatch::query()->whereNull('ended_at')->whereIn('request_id', $requestIds)->get(['id', 'request_id']) as $match) {
            $matchIdByRequest[(int) $match->request_id] = (int) $match->id;
        }

        return $matchIdByRequest;
    }

    /**
     * The newest accepted Request's Match. `not_yet_started` never calls this, so its `match_id` stays null.
     *
     * @param  Collection<int, Request>  $requests
     * @param  array<int, int>  $matchIdByRequest
     */
    private function newestMatchId(Collection $requests, int $courseId, array $matchIdByRequest): ?int
    {
        $accepted = $requests
            ->filter(fn (Request $request): bool => (int) $request->course_id === $courseId && $this->requestState->phase($request) === 'accepted')
            ->sortByDesc(fn (Request $request): int => (int) $request->id);

        foreach ($accepted as $request) {
            if (isset($matchIdByRequest[(int) $request->id])) {
                return $matchIdByRequest[(int) $request->id];
            }
        }

        return null;
    }
}
