<?php

namespace App\Modules\Notifications\Queries;

use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * An Employee's notices (AD-11): stored event notices plus derived Request time notices, newest
 * first. Notices at the same instant are ordered by id descending. Derived rows are computed, never
 * written. No read state, no count, no pagination.
 */
class Inbox
{
    public function __construct(private readonly TimeNoticeSource $timeNotices) {}

    /**
     * @return list<array{id: string, type: NoticeType, occurred_at: Carbon, fields: array<string, mixed>}>
     */
    public function handle(int $userId): array
    {
        // Only users are notifiable, so the id alone picks the recipient's notices.
        $stored = DB::table('notifications')
            ->where('notifiable_id', $userId)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get(['id', 'type', 'data', 'created_at'])
            ->map(fn (object $row): array => [
                'id' => (string) $row->id,
                'type' => NoticeType::from($row->type),
                'occurred_at' => Carbon::parse($row->created_at, 'UTC'),
                'fields' => (array) json_decode($row->data, true, flags: JSON_THROW_ON_ERROR),
            ])
            ->values()
            ->all();

        $notices = [...$stored, ...$this->timeNotices->handle($userId)];

        usort($notices, function (array $left, array $right): int {
            if (! $left['occurred_at']->equalTo($right['occurred_at'])) {
                return $left['occurred_at']->lessThan($right['occurred_at']) ? 1 : -1;
            }

            return $right['id'] <=> $left['id'];
        });

        return $notices;
    }
}
