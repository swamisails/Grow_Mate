<?php

namespace Tests\Feature\Notifications;

use App\Modules\Accounts\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Feature\ApiTestCase;

abstract class NotificationsTestCase extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

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
