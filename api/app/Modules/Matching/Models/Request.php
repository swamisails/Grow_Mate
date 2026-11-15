<?php

namespace App\Modules\Matching\Models;

use Database\Factories\RequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A Learner's ask to one Mentor for one Course (AD-4). Open and accepted are derived from
 * `accepted_at`; nothing here stores a status. Written by `SendRequest` and `AcceptRequest`.
 *
 * @property int $id
 * @property int $learner_id
 * @property int $mentor_id
 * @property int $course_id
 * @property int|null $group_assignment_id
 * @property Carbon $sent_at
 * @property Carbon|null $accepted_at
 */
#[Fillable(['learner_id', 'mentor_id', 'course_id', 'group_assignment_id', 'sent_at', 'accepted_at'])]
#[Hidden(['group_assignment_id'])]
#[UseFactory(RequestFactory::class)]
class Request extends Model
{
    /** @use HasFactory<RequestFactory> */
    use HasFactory;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }
}
