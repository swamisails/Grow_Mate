<?php

namespace App\Modules\Assessments\Database\Seeders;

use Illuminate\Database\Seeder;

class AssessmentsSeeder extends Seeder
{
    /**
     * Assessments' slot in the AD-17 order (last, after Mentors and Matching). There are no demo
     * attempts: every attempt is a Learner's own submission, so this seeds nothing.
     */
    public function run(): void {}
}
