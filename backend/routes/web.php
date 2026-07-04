<?php

use Illuminate\Support\Facades\Route;

// The root "/" route is registered in bootstrap/app.php (then: callback)
// outside of ALL middleware groups so it works without APP_KEY or sessions.
