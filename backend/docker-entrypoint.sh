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

# ── Resolve database connection from DATABASE_URL if individual vars are missing ──
# Render wires the database via DATABASE_URL (connectionString). The individual
# DB_HOST / DB_PORT / etc. vars are only set when fromDatabase is used in the
# Blueprint. If they are absent, parse them from DATABASE_URL so the wait
# loop below works correctly.
if [ -z "$DB_HOST" ] && [ -n "$DATABASE_URL" ]; then
    # postgres://user:pass@host:port/dbname  (or postgresql://)
    _DSN="${DATABASE_URL#postgres*://}"          # strip scheme
    DB_USERNAME="${_DSN%%:*}"                    # everything before first ':'
    _DSN="${_DSN#*:}"                            # strip username
    DB_PASSWORD="${_DSN%%@*}"                    # everything before '@'
    _DSN="${_DSN#*@}"                            # strip password@
    DB_HOST="${_DSN%%[:\/]*}"                    # host (stop at ':' or '/')
    _DSN="${_DSN#*:}"                            # strip host:
    DB_PORT="${_DSN%%\/*}"                       # port (stop at '/')
    DB_DATABASE="${_DSN#*/}"                     # dbname (after '/')
    DB_DATABASE="${DB_DATABASE%%\?*}"            # strip query string
    echo "  Parsed DATABASE_URL → host=${DB_HOST} port=${DB_PORT} db=${DB_DATABASE}"
fi

# Wait for PostgreSQL to be ready (max 90 seconds)
echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT:-5432}..."
RETRIES=30
until php -r "
    \$host = '${DB_HOST}';
    \$port = '${DB_PORT:-5432}';
    \$db   = '${DB_DATABASE}';
    \$user = '${DB_USERNAME}';
    \$pass = '${DB_PASSWORD}';
    if (empty(\$host)) { echo 'skip'; exit(0); }
    try {
        new PDO(\"pgsql:host=\$host;port=\$port;dbname=\$db\", \$user, \$pass);
        echo 'ok';
    } catch (Exception \$e) {
        exit(1);
    }
" 2>/dev/null | grep -qE "ok|skip"; do
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

# Always sync default users (updateOrCreate — safe to run every boot)
echo "Syncing default user accounts..."
php artisan db:seed --class=Database\\Seeders\\UserSeeder --force

# Seed sample tasks only on a fresh database
echo "Checking if database needs task seeding..."
USER_COUNT=$(php -r "
require __DIR__.'/vendor/autoload.php';
\$app = require_once __DIR__.'/bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();
echo App\Models\User::count();
" 2>/dev/null || echo "0")

TASK_COUNT=$(php -r "
require __DIR__.'/vendor/autoload.php';
\$app = require_once __DIR__.'/bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();
echo App\Models\Task::count();
" 2>/dev/null || echo "0")

if [ "$TASK_COUNT" = "0" ]; then
    echo "Seeding sample tasks..."
    php artisan db:seed --class=Database\\Seeders\\TaskSeeder --force
else
    echo "Tasks already seeded (${TASK_COUNT} found) — skipping."
fi

# Set up Laravel scheduler cron (runs every minute, artisan handles the schedule)
echo "* * * * * www-data cd /var/www/html && php artisan schedule:run >> /var/log/laravel-schedule.log 2>&1" > /etc/cron.d/laravel-scheduler
chmod 0644 /etc/cron.d/laravel-scheduler
cron

echo "Starting Apache..."
exec "$@"
