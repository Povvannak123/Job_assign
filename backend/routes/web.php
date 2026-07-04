<?php

use Illuminate\Support\Facades\Route;

// Root route: return a simple JSON status without needing session/cookie
// encryption middleware (which requires APP_KEY). This keeps the backend
// root URL healthy on Render even before APP_KEY is manually configured.
Route::get('/', function () {
    return response()->json([
        'service' => 'Job Assign Management System API',
        'version' => '1.0',
        'status'  => 'ok',
        'health'  => url('/up'),
    ]);
})->withoutMiddleware([
    \Illuminate\Cookie\Middleware\EncryptCookies::class,
    \Illuminate\Session\Middleware\StartSession::class,
    \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
]);
