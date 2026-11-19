<?php

namespace App\Modules\Matching\Models;

use Database\Factories\MentorMatchFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * The pairing created by Accept (AD-4). The glossary name is Match; the class is `MentorMatch`.
 * One row per Request. Accept records only `started_at`. `ended_at` null is a live Match.
 *
 * @property int $id
 * @property int $request_id
 * @property Carbon $started_at
 * @property Carbon|null $ended_at
 * @property MatchEndReason|null $end_reason
 * @property int|null $quit_by_id
 * @property string|null $quit_reason
 */
#[Fillable(['request_id', 'started_at', 'ended_at', 'end_reason', 'quit_by_id', 'quit_reason'])]
#[UseFactory(MentorMatchFactory::class)]
class MentorMatch extends Model
{
    /** @use HasFactory<MentorMatchFactory> */
    use HasFactory;

    protected $table = 'matches';

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'end_reason' => MatchEndReason::class,
            'quit_by_id' => 'integer',
        ];
    }
}
