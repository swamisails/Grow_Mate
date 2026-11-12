#!/usr/bin/env bash
# End-to-end run (R10): bring up the e2e stack, reset and reseed its database, then run Playwright.
# Needs the root .env (see .env.example). Usage: ./e2e/run.sh [playwright args...]
set -euo pipefail

cd "$(dirname "$0")/.."

compose() {
  docker compose -f docker-compose.yml -f docker-compose.e2e.yml "$@"
}

# Brings the e2e stack up, rebuilding only what changed; a no-op when it is already up and current.
compose up -d --build --wait

echo "Resetting and reseeding the e2e database..."
compose exec -T api php artisan migrate:fresh --seed --force

echo "Running Playwright..."
compose run --rm --no-deps --build playwright npx playwright test "$@"
