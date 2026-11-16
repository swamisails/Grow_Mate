<?php

namespace App\Modules\Notifications\Queries;

use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * An Employee's notices (AD-11): every event notice sent to them, newest first. Notices created in
 * the same second are ordered by their UUIDv7 ids, which are time-ordered. No read state, no count,
 * no pagination.
 */
class Inbox
{
    /**
     * @return list<array{id: string, type: NoticeType, occurred_at: Carbon, fields: array<string, mixed>}>
     */
    public function handle(int $userId): array
    {
        // Only users are notifiable, so the id alone picks the recipient's notices.
        return DB::table('notifications')
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
    }
}
