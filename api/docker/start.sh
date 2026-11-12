#!/bin/sh
# Starts PHP-FPM and nginx in the api container. One-shot commands (migrations, seeders,
# tests) override this with `docker compose run --rm api php artisan ...`.
set -e

php-fpm --daemonize
exec nginx -g 'daemon off;'
