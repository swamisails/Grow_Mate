<?php

namespace App\Modules\Matching\Models;

use Database\Factories\GroupAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Admin's group assignment. This entry stores the id and never reads or accepts a group.
 *
 * @property int $id
 */
#[UseFactory(GroupAssignmentFactory::class)]
class GroupAssignment extends Model
{
    /** @use HasFactory<GroupAssignmentFactory> */
    use HasFactory;

    public $timestamps = false;
}
