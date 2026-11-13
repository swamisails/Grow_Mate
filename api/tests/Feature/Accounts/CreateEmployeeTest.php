<?php

namespace Tests\Feature\Accounts;

use App\Modules\Accounts\Actions\CreateEmployee;
use App\Modules\Accounts\Models\User;
use App\Modules\Accounts\Queries\EmployeeIdByEmail;
use App\Modules\Accounts\Queries\UserNames;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Hash;

class CreateEmployeeTest extends AccountsTestCase
{
    public function test_it_creates_an_employee_without_signing_them_in(): void
    {
        $id = app(CreateEmployee::class)->handle('Rafi Haddad', 'Rafi.Haddad@Example.com', 'demo-password');

        $user = User::query()->sole();
        $this->assertSame($user->id, $id);
        $this->assertSame('Rafi Haddad', $user->name);
        $this->assertSame('rafi.haddad@example.com', $user->email);
        $this->assertFalse($user->is_admin);
        $this->assertTrue(Hash::check('demo-password', $user->password));
        $this->assertGuest('web');
    }

    public function test_a_taken_email_is_refused(): void
    {
        User::factory()->create(['email' => 'rafi@example.com']);

        $this->expectException(UniqueConstraintViolationException::class);
        app(CreateEmployee::class)->handle('Rafi', 'RAFI@example.com', 'demo-password');
    }

    public function test_employee_id_by_email_ignores_case_and_never_finds_the_admin(): void
    {
        $rafi = User::factory()->create(['email' => 'rafi@example.com']);
        User::factory()->admin()->create(['email' => 'Noor@Example.com']);
        $lookup = app(EmployeeIdByEmail::class);

        $this->assertSame($rafi->id, $lookup->handle('RAFI@example.com'));
        $this->assertNull($lookup->handle('noor@example.com'));
        $this->assertNull($lookup->handle('nobody@example.com'));
    }

    public function test_user_names_maps_existing_ids_to_names(): void
    {
        $rafi = User::factory()->create(['name' => 'Rafi Haddad']);
        $imani = User::factory()->create(['name' => 'Imani Okafor']);
        $names = app(UserNames::class);

        $result = $names->handle([$imani->id, $rafi->id, 999999]);
        ksort($result);

        $this->assertSame([$rafi->id => 'Rafi Haddad', $imani->id => 'Imani Okafor'], $result);
        $this->assertSame([], $names->handle([]));
    }
}
