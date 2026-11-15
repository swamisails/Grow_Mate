<?php

namespace App\Modules\Matching\Models;

use Database\Factories\MentorMatchFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * The live pairing created by Accept (AD-4). The glossary name is Match; the class is `MentorMatch`.
 * One row per Request. This entry records only `started_at`.
 *
 * @property int $id
 * @property int $request_id
 * @property Carbon $started_at
 */
#[Fillable(['request_id', 'started_at'])]
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
        ];
    }
}
