# GrowMate API image (AD-17): PHP-FPM and nginx in one container.
# Configuration comes only from environment variables; no .env file is baked in.

FROM composer:2 AS composer

FROM php:8.5-fpm

ARG APP_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx curl unzip \
    && docker-php-ext-install pdo_mysql \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

COPY --from=composer /usr/bin/composer /usr/bin/composer

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-growmate.conf
COPY docker/start.sh /usr/local/bin/start

WORKDIR /var/www/html

# Dependencies first, for layer caching. Dev dependencies (PHPUnit) everywhere except production.
COPY composer.json composer.lock ./
RUN if [ "$APP_ENV" = "production" ]; then NO_DEV="--no-dev"; else NO_DEV=""; fi \
    && composer install $NO_DEV --no-interaction --no-scripts --no-autoloader --prefer-dist

COPY . .

RUN if [ "$APP_ENV" = "production" ]; then NO_DEV="--no-dev"; else NO_DEV=""; fi \
    && composer dump-autoload $NO_DEV --optimize --no-interaction \
    && php artisan package:discover --ansi \
    # Empty on purpose: configuration comes only from the container's env vars (AD-17); the file
    # just stops Dotenv's suppressed "missing .env" warning from surfacing in `php artisan test`.
    && touch .env \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x /usr/local/bin/start

EXPOSE 80

CMD ["start"]
