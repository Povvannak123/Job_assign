<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\StaffMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Root route registered with NO middleware (no session, no cookie encryption)
            // so it always responds 200 regardless of APP_KEY configuration.
            \Illuminate\Support\Facades\Route::get('/', function () {
                return response()->json([
                    'service' => 'Job Assign Management System API',
                    'version' => '1.0',
                    'status'  => 'ok',
                ]);
            });
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'staff' => StaffMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
