<?php

use App\Http\Middleware\ApplyTestClock;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        // AD-1: no Blade UI, so no web routes; Sanctum registers /sanctum/csrf-cookie itself.
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // AD-9: Sanctum first-party SPA cookie sessions on the shared origin.
        $middleware->statefulApi();

        // AD-6: local, production, and testing register neither the clock route nor this middleware.
        // The kernel is resolved before the container's env binding exists, so this reads the process env.
        // Global, and first: Sanctum's csrf route and the session both have to see the same instant,
        // or a jump past the session lifetime makes the next sign-in a CSRF mismatch.
        $appEnv = $_SERVER['APP_ENV'] ?? $_ENV['APP_ENV'] ?? getenv('APP_ENV');
        if ($appEnv === 'e2e') {
            $middleware->prepend(ApplyTestClock::class);
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*', 'sanctum/*') || $request->expectsJson(),
        );
    })->create();
