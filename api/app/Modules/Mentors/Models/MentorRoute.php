<?php

namespace App\Modules\Mentors\Models;

use Database\Factories\MentorRouteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * One Employee is a Mentor for one Course (AD-7). Written only by `GrantMentor`.
 *
 * @property int $id
 * @property int $user_id
 * @property int $course_id
 * @property Route $route
 */
#[Fillable(['user_id', 'course_id', 'route'])]
#[UseFactory(MentorRouteFactory::class)]
class MentorRoute extends Model
{
    /** @use HasFactory<MentorRouteFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'route' => Route::class,
        ];
    }
}
