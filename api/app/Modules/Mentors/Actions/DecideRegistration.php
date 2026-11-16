<?php

namespace App\Modules\Mentors\Actions;

use App\Modules\Mentors\ErrorCode;
use App\Modules\Mentors\Exceptions\MentorRuleViolation;
use App\Modules\Mentors\Models\MentorCheckCourse;
use App\Modules\Mentors\Models\Outcome;
use App\Modules\Mentors\Models\RegistrationDecision;
use App\Modules\Mentors\Models\Route;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DecideRegistration
{
    public function __construct(private readonly GrantMentor $grantMentor) {}

    /**
     * Records Admin's one final Registration decision (R3) on a Course from an Employee's Mentor
     * check. An approval makes the Employee a Mentor for the Course by Registration approval (AD-7),
     * in the same transaction; a refusal is only stored. The only writer of `registration_decisions`.
     *
     * @param  int  $mentorCheckCourseId  the `mentor_check_courses` row being decided
     * @return array{id: int, outcome: Outcome}
     *
     * @throws NotFoundHttpException (a 404) when there is no such Mentor-check Course
     * @throws MentorRuleViolation (a 409) when the Course already has its decision. Nothing changes.
     */
    public function handle(int $mentorCheckCourseId, Outcome $outcome): array
    {
        DB::transaction(function () use ($mentorCheckCourseId, $outcome): void {
            $named = MentorCheckCourse::query()
                ->join('mentor_checks', 'mentor_checks.id', '=', 'mentor_check_courses.mentor_check_id')
                ->where('mentor_check_courses.id', $mentorCheckCourseId)
                ->toBase()
                ->first(['mentor_checks.user_id', 'mentor_check_courses.course_id']);
            abort_if($named === null, 404, 'Not found.');

            $userId = (int) $named->user_id;
            $courseId = (int) $named->course_id;

            if (RegistrationDecision::query()->where('user_id', $userId)->where('course_id', $courseId)->exists()) {
                throw new MentorRuleViolation(ErrorCode::AlreadyDecided);
            }

            try {
                RegistrationDecision::query()->create(['user_id' => $userId, 'course_id' => $courseId, 'outcome' => $outcome]);
            } catch (UniqueConstraintViolationException) {
                // A concurrent decision committed first; this snapshot couldn't see it.
                throw new MentorRuleViolation(ErrorCode::AlreadyDecided);
            }

            if ($outcome === Outcome::Approved) {
                // A pair already granted keeps its first route (AD-7).
                $this->grantMentor->handle($userId, $courseId, Route::RegistrationApproval);
            }
        });

        // The decision is committed here. Entry 8 sends its notice from this point, after the commit (AD-11).
        return ['id' => $mentorCheckCourseId, 'outcome' => $outcome];
    }
}
