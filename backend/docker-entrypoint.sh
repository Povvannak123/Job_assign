#!/bin/bash
set -e

echo "=== Job Assign Management System — Backend ==="

# ── Validate APP_KEY ──────────────────────────────────────────────────────────
# Render's generateValue:true produces a hex/random string, not Laravel's
# required "base64:<32-bytes>" format. Auto-fix it if needed so the app
# doesn't return 500 on every request due to an invalid encryption cipher.
if [ -z "$APP_KEY" ] || ! echo "$APP_KEY" | grep -qE "^base64:.{40,}"; then
    echo "WARNING: APP_KEY is missing or not in Laravel format (base64:...)."
    GENERATED_KEY="base64:$(head -c 32 /dev/urandom | base64 | tr -d '\n=')"
    export APP_KEY="$GENERATED_KEY"
    echo "  ✔  Generated a temporary APP_KEY for this boot."
    echo "  ➜  Set this permanently on your hosting platform:"
    echo "     APP_KEY=$APP_KEY"
fi

# Wait for PostgreSQL to be ready (max 90 seconds)
echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
RETRIES=30
until php -r "
    try {
        new PDO(
            'pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}',
            '${DB_USERNAME}',
            '${DB_PASSWORD}'
        );
        echo 'ok';
    } catch (Exception \$e) {
        exit(1);
    }
" 2>/dev/null | grep -q "ok"; do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -le 0 ]; then
        echo "ERROR: PostgreSQL did not become ready in time. Starting anyway..."
        break
    fi
    echo "  PostgreSQL not ready yet — retrying in 3s... (${RETRIES} attempts left)"
    sleep 3
done
echo "PostgreSQL is ready (or timed out — continuing)."

# Re-apply permissions at runtime (Docker volume mounts can reset ownership)
mkdir -p storage/framework/{sessions,views,cache/data,testing} storage/logs bootstrap/cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Clear config cache to pick up environment variables
php artisan config:clear 2>/dev/null || true

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Clear application cache now that tables exist
php artisan cache:clear 2>/dev/null || true

# Create the public storage symlink so uploaded files are web-accessible
php artisan storage:link --force 2>/dev/null || true

# Seed only if no users exist
echo "Checking if database needs seeding..."
USER_COUNT=$(php -r "
require __DIR__.'/vendor/autoload.php';
\$app = require_once __DIR__.'/bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();
echo App\Models\User::count();
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
    echo "Seeding database..."
    php artisan db:seed --force
else
    echo "Database already seeded (${USER_COUNT} users found) — skipping."
fi

# Set up Laravel scheduler cron (runs every minute, artisan handles the schedule)
echo "* * * * * www-data cd /var/www/html && php artisan schedule:run >> /var/log/laravel-schedule.log 2>&1" > /etc/cron.d/laravel-scheduler
chmod 0644 /etc/cron.d/laravel-scheduler
cron

echo "Starting Apache..."
exec "$@"
