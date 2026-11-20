<?php

namespace Tests\Feature\Assessments;

use App\Modules\Assessments\Models\StageAttempt;
use Database\Seeders\DatabaseSeeder;

class AssessmentsSeederTest extends AssessmentsTestCase
{
    public function test_seeding_runs_in_the_ad_17_order_and_creates_no_attempts(): void
    {
        $this->app->instance('env', 'e2e');
        config(['accounts.admin' => ['name' => 'Noor', 'email' => 'noor@example.com', 'password' => 'password']]);

        $this->seed(DatabaseSeeder::class);

        $this->assertSame(0, StageAttempt::query()->count());
    }
}
