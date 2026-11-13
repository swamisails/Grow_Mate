<?php

namespace Tests\Feature\Mentors;

use App\Modules\Mentors\Actions\GrantMentor;
use App\Modules\Mentors\Models\MentorRoute;
use App\Modules\Mentors\Models\Route;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;

class GrantMentorTest extends MentorsTestCase
{
    /**
     * @return array<string, array{0: Route}>
     */
    public static function routes(): array
    {
        return [
            'gold_pass' => [Route::GoldPass],
            'registration_approval' => [Route::RegistrationApproval],
            'group_assignment_accepted' => [Route::GroupAssignmentAccepted],
        ];
    }

    #[DataProvider('routes')]
    public function test_a_grant_records_the_route(Route $route): void
    {
        $user = $this->employee('Rafi Haddad');
        $course = $this->publishedCourse();

        $this->grant($user, $course, $route);

        $this->assertDatabaseHas('mentor_routes', ['user_id' => $user->id, 'course_id' => $course->id, 'route' => $route->value]);
        $this->assertSame($route, MentorRoute::query()->sole()->route);
    }

    public function test_a_repeat_grant_keeps_the_first_route_and_one_row(): void
    {
        $user = $this->employee('Rafi Haddad');
        $course = $this->publishedCourse();

        $this->grant($user, $course, Route::RegistrationApproval);
        $this->grant($user, $course, Route::GoldPass);
        $this->grant($user, $course, Route::GroupAssignmentAccepted);

        $this->assertSame(1, MentorRoute::query()->count());
        $this->assertSame(Route::RegistrationApproval, MentorRoute::query()->sole()->route);
    }

    public function test_a_repeat_grant_inside_a_callers_transaction_is_a_no_op(): void
    {
        $user = $this->employee('Rafi Haddad');
        $course = $this->publishedCourse();
        $this->grant($user, $course, Route::GoldPass);

        // A later epic's Action (e.g. AcceptRequest) calls GrantMentor inside its own transaction;
        // the duplicate must not abort it.
        DB::transaction(function () use ($user, $course): void {
            $this->grant($user, $course, Route::GroupAssignmentAccepted);
            $this->employee('Still written');
        });

        $this->assertSame(Route::GoldPass, MentorRoute::query()->sole()->route);
        $this->assertDatabaseHas('users', ['name' => 'Still written']);
    }

    public function test_the_same_user_can_mentor_several_courses(): void
    {
        $user = $this->employee('Rafi Haddad');
        $this->grant($user, $this->publishedCourse());
        $this->grant($user, $this->publishedCourse(), Route::GoldPass);

        $this->assertSame(2, MentorRoute::query()->where('user_id', $user->id)->count());
    }

    public function test_a_grant_for_a_missing_course_fails(): void
    {
        $user = $this->employee('Rafi Haddad');

        $this->expectException(QueryException::class);
        app(GrantMentor::class)->handle($user->id, 999999, Route::GoldPass);
    }
}
