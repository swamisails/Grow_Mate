<?php

namespace App\Modules\Matching\Models;

use Database\Factories\GroupAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Admin's group assignment (UJ-4): one Course, the chosen Employee, and one pending Request per
 * Learner, each with `sent_at` equal to `created_at`. Written only by `AssignGroup`. Its id is
 * stored on each Request and never returned (AD-8).
 *
 * @property int $id
 * @property int $course_id
 * @property int $mentor_id
 * @property Carbon $created_at
 */
#[Fillable(['course_id', 'mentor_id', 'created_at'])]
#[UseFactory(GroupAssignmentFactory::class)]
class GroupAssignment extends Model
{
    /** @use HasFactory<GroupAssignmentFactory> */
    use HasFactory;

    /** `created_at` is set by `AssignGroup` to the Requests' shared sent time; there is no `updated_at`. */
    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
