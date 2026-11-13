<?php

namespace App\Modules\Mentors\Database\Seeders;

use App\Modules\Accounts\Actions\CreateEmployee;
use App\Modules\Accounts\Queries\EmployeeIdByEmail;
use App\Modules\Courses\Queries\PublishedCourses;
use App\Modules\Mentors\Actions\GrantMentor;
use App\Modules\Mentors\Actions\SubmitMentorCheck;
use App\Modules\Mentors\Models\Route;
use App\Modules\Mentors\Queries\MentorCheckStatus;
use Illuminate\Database\Seeder;

class MentorsSeeder extends Seeder
{
    /** Every demo Employee signs in with this password (local and e2e only). */
    public const DEMO_PASSWORD = 'demo-password';

    /**
     * Demo Employees and Mentor grants, in `local` and `e2e` only (AD-17: runs after Courses).
     * Employees are created through Accounts and grants through GrantMentor, so reseeding changes
     * nothing. Each demo Employee has skipped the Mentor check (no Course rows), so they sign in
     * straight to Home; no named Course or Registration decision rows are made.
     */
    public function run(
        EmployeeIdByEmail $employeeIdByEmail,
        CreateEmployee $createEmployee,
        PublishedCourses $publishedCourses,
        GrantMentor $grantMentor,
        MentorCheckStatus $mentorCheckStatus,
        SubmitMentorCheck $submitMentorCheck,
    ): void {
        if (! app()->environment(['local', 'e2e'])) {
            return;
        }

        $employeeIds = [];
        foreach ($this->demoEmployees() as $key => $employee) {
            $employeeIds[$key] = $employeeIdByEmail->handle($employee['email'])
                ?? $createEmployee->handle($employee['name'], $employee['email'], self::DEMO_PASSWORD);
        }

        $courseIds = $publishedCourses->handle()->pluck('id', 'title');

        foreach ($this->demoGrants() as [$employee, $title, $route]) {
            $courseId = $courseIds->get($title);
            if ($courseId !== null) {
                $grantMentor->handle($employeeIds[$employee], (int) $courseId, $route);
            }
        }

        // A skip, once: on a reseed the check is already done, which is not an error here.
        foreach ($employeeIds as $employeeId) {
            if ($mentorCheckStatus->handle($employeeId)['pending']) {
                $submitMentorCheck->handle($employeeId, []);
            }
        }
    }

    /**
     * @return array<string, array{name: string, email: string}>
     */
    private function demoEmployees(): array
    {
        return [
            'priya' => ['name' => 'Priya Nair', 'email' => 'priya.nair@example.com'],
            'rafi' => ['name' => 'Rafi Haddad', 'email' => 'rafi.haddad@example.com'],
            'imani' => ['name' => 'Imani Okafor', 'email' => 'imani.okafor@example.com'],
        ];
    }

    /**
     * @return list<array{0: string, 1: string, 2: Route}>
     */
    private function demoGrants(): array
    {
        return [
            ['rafi', 'Python Basics', Route::RegistrationApproval],
            ['imani', 'Python Basics', Route::RegistrationApproval],
        ];
    }
}
