<?php

return [

    /*
    | The one Admin (AD-9), seeded idempotently in every environment by
    | App\Modules\Accounts\Database\Seeders\AccountsSeeder.
    */

    'admin' => [
        'name' => env('ADMIN_NAME'),
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
    ],

];
