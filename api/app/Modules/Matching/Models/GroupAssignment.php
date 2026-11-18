<?php

namespace App\Modules\Matching\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Admin's group assignment. This entry stores the id and never reads or accepts a group.
 *
 * @property int $id
 */
class GroupAssignment extends Model
{
    public $timestamps = false;
}
