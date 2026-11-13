<?php

namespace App\Modules\Mentors\Models;

use Database\Factories\MentorCheckCourseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * One Course named in a Mentor check. Written only by `SubmitMentorCheck`.
 *
 * @property int $id
 * @property int $mentor_check_id
 * @property int $course_id
 */
#[Fillable(['mentor_check_id', 'course_id'])]
#[UseFactory(MentorCheckCourseFactory::class)]
class MentorCheckCourse extends Model
{
    /** @use HasFactory<MentorCheckCourseFactory> */
    use HasFactory;
}
