<?php

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
        // AD-1/AD-17: `api` is reachable only through the `web` nginx proxy on the private Compose
        // network, and `web` sets X-Forwarded-For to the browser's address (never appending a
        // client's own). Trusting private addresses (not '*', which trusts every address) makes
        // `$request->ip()` the browser's address, which the sign-in and sign-up rate limits key on.
        $middleware->trustProxies(at: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.1', '::1']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*', 'sanctum/*') || $request->expectsJson(),
        );
    })->create();
