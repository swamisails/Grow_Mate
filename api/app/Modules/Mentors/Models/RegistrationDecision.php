<?php

namespace App\Modules\Mentors\Models;

use Database\Factories\RegistrationDecisionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Admin's one final decision on a Course an Employee named in their Mentor check (R3). Written only
 * by `DecideRegistration`.
 *
 * @property int $id
 * @property int $user_id
 * @property int $course_id
 * @property Outcome $outcome
 */
#[Fillable(['user_id', 'course_id', 'outcome'])]
#[UseFactory(RegistrationDecisionFactory::class)]
class RegistrationDecision extends Model
{
    /** @use HasFactory<RegistrationDecisionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'outcome' => Outcome::class,
        ];
    }
}
