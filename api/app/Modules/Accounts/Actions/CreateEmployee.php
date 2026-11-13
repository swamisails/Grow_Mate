<?php

namespace App\Modules\Accounts\Actions;

use App\Modules\Accounts\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateEmployee
{
    /**
     * Create an Employee without signing them in, for other modules' seeders. Never creates an
     * Admin (C2). Returns the new user's id.
     *
     * @throws UniqueConstraintViolationException when the email is already taken
     */
    public function handle(string $name, string $email, string $password): int
    {
        $user = new User([
            'name' => $name,
            'email' => Str::lower($email),
            'password' => $password,
        ]);
        // `is_admin` is not fillable; set it here so this is always an Employee.
        $user->is_admin = false;

        DB::transaction(fn () => $user->save());

        return $user->id;
    }
}
