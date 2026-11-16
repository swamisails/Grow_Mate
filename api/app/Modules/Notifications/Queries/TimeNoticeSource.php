<?php

namespace App\Modules\Notifications\Queries;

use App\Modules\Notifications\NoticeType;
use Illuminate\Support\Carbon;

/**
 * Derived notices for one Employee, computed on read and never stored. Matching supplies the
 * Request rows; the inbox merges them with stored notices.
 */
interface TimeNoticeSource
{
    /**
     * @return list<array{id: string, type: NoticeType, occurred_at: Carbon, fields: array<string, mixed>}>
     */
    public function handle(int $userId): array;
}
