<?php

namespace Database\Seeders;

use App\Modules\Accounts\Database\Seeders\AccountsSeeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Module seeders in AD-17 order: Accounts, Courses, Mentors, Matching, Assessments.
     * Only Accounts exists so far; later modules append their seeder here, in that order.
     */
    public function run(): void
    {
        $this->call([
            AccountsSeeder::class,
        ]);
    }
}
