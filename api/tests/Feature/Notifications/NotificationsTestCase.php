<?php

namespace Tests\Feature\Notifications;

use App\Modules\Accounts\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

abstract class NotificationsTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Requests come from the SPA on the shared origin (AD-1), so Sanctum treats them as stateful.
        config(['sanctum.stateful' => ['localhost']]);
        $this->withHeader('Referer', 'http://localhost/');
        $this->travelTo(now()->startOfSecond());
    }

    protected function employee(string $name): User
    {
        return User::factory()->create(['name' => $name]);
    }

    /**
     * Every stored notice, oldest row first by insertion.
     *
     * @return list<object>
     */
    protected function storedNotices(): array
    {
        return DB::table('notifications')->orderBy('created_at')->orderBy('id')->get()->all();
    }
}
