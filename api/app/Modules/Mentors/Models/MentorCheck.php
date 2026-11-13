<?php

namespace App\Modules\Mentors\Models;

use Database\Factories\MentorCheckFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An Employee's one Mentor check (AD-15): the Courses they named, or a skip when it has none.
 * Written only by `SubmitMentorCheck`.
 *
 * @property int $id
 * @property int $user_id
 */
#[Fillable(['user_id'])]
#[UseFactory(MentorCheckFactory::class)]
class MentorCheck extends Model
{
    /** @use HasFactory<MentorCheckFactory> */
    use HasFactory;

    /**
     * The Courses named in this check; none for a skip.
     *
     * @return HasMany<MentorCheckCourse, $this>
     */
    public function courses(): HasMany
    {
        return $this->hasMany(MentorCheckCourse::class);
    }
}
