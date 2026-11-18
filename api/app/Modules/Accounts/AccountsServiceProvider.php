<?php

namespace App\Modules\Accounts;

use App\Modules\Accounts\Policies\RolePolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AccountsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // AD-9: the one `admin` gate in front of every /api/v1/admin/* route.
        Gate::define('admin', [RolePolicy::class, 'admin']);
        // Its counterpart in front of the Employee routes, so no other module owns that role check (AD-3).
        Gate::define('employee', [RolePolicy::class, 'employee']);

        $this->defineRateLimiters();
    }

    /**
     * Throttles password guessing and account probing. Only refused attempts (422) count, so
     * successful sign-ins are never slowed; once a limit is reached every attempt on that key is 429.
     */
    private function defineRateLimiters(): void
    {
        RateLimiter::for('sign-in', function (Request $request): array {
            $email = $request->input('email');
            // Lower-cased and transliterated, as the accent- and case-insensitive collation matches emails.
            $email = is_string($email) ? Str::lower(Str::ascii($email)) : '';

            return [
                $this->refusedAttempts(5)->by('sign-in:'.$email.'|'.$request->ip()),
                $this->refusedAttempts(20)->by('sign-in:'.$request->ip()),
            ];
        });

        RateLimiter::for('sign-up', fn (Request $request): Limit => $this->refusedAttempts(10)->by('sign-up:'.$request->ip()));
    }

    /**
     * A per-minute limit that counts only 422 responses and answers in the AD-10 error shape.
     */
    private function refusedAttempts(int $perMinute): Limit
    {
        return Limit::perMinute($perMinute)
            ->after(fn (Response $response): bool => $response->getStatusCode() === 422)
            ->response(fn (Request $request, array $headers): JsonResponse => response()->json(
                ['message' => 'Too many attempts. Try again in a minute.'],
                429,
                $headers,
            ));
    }
}
