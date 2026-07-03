<?php

return [
    'paths'           => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],

    // Explicit origins (localhost for local dev + the configured frontend URL)
    'allowed_origins' => array_filter([
        'http://localhost:5173',
        'http://localhost:3000',
        env('FRONTEND_URL'),
    ]),

    // Pattern-based origins: allow any *.onrender.com or *.vercel.app HTTPS URL
    // so the hosted frontend is automatically whitelisted without needing FRONTEND_URL.
    'allowed_origins_patterns' => [
        '#^https://[a-zA-Z0-9\-]+\.onrender\.com$#',
        '#^https://[a-zA-Z0-9\-]+\.vercel\.app$#',
        '#^http://localhost(:\d+)?$#',
    ],

    'allowed_headers'  => ['*'],
    'exposed_headers'  => [],
    'max_age'          => 0,
    'supports_credentials' => false,
];
