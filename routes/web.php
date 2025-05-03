<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Services\EmailVerificationService;
use Illuminate\Http\Request;

Route::get('/', function () {return view('auth.login');});

Route::get('/register', function () {return view('auth.register');})->name('register');

// Dashboard Route (add protection with middleware)
Route::get('/dashboard', function (Request $request) {
    // Get token and user_id from session
    $token = session('jwt_token');
    $userId = session('user_id');
    
    \Log::info('Dashboard request - Session ID: ' . session()->getId());
    \Log::info('JWT Token in session: ' . ($token ? 'Present' : 'Not present'));
    \Log::info('User ID in session: ' . ($userId ? $userId : 'Not present'));
    
    // If no token or user_id, redirect to login
    if (!$token || !$userId) {
        return redirect('/')->with('error', 'Please log in to access the dashboard.');
    }
    
    // Validate token manually
    $decoder = app(App\Http\Auth\TokenDecoder::class);
    $user = $decoder->getUserFromToken($token);
    
    if (!$user || $user->getKey() != $userId) {
        // Invalid token, clear it and redirect
        session()->forget(['jwt_token', 'user_id']);
        return redirect('/')->with('error', 'Your session has expired. Please log in again.');
    }
    
    // Login the user
    auth()->login($user);
    
    // Pass user data to view
    return view('ui.dashboard', [
        'user' => $user
    ]);
})->name('dashboard');

// Forgot Password Route
Route::get('/forgot-password', function () {return view('auth.forgot-password');})->name('password.request');

Route::get('/reset-password/{token}', function ($token) {return view('auth.reset-password', ['token' => $token]);})->name('password.reset');

// Email Verification Route
Route::get('/verify-email/{token}', function ($token) {
    $verificationService = app(EmailVerificationService::class);
    $verified = $verificationService->verifyEmail($token);
    
    if ($verified) {
        return redirect('/')->with('success', 'Your email has been verified! You can now log in.');
    } else {
        return redirect('/')->with('error', 'Invalid or expired verification link.');
    }
})->name('verification.verify');

Route::post('/set-session-token', function (Request $request) {
    try {
        // Log the incoming token (truncated for security)
        $tokenLength = strlen($request->token ?? '');
        $tokenPreview = $tokenLength > 0 ? substr($request->token, 0, 10) . '...' : 'empty';
        \Log::info("Set-session-token called with token: {$tokenPreview} (length: {$tokenLength})");
        
        // Verify the token before storing it
        $decoder = app(App\Http\Auth\TokenDecoder::class);
        $user = $decoder->getUserFromToken($request->token);
        
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Invalid token'], 401);
        }
        
        session()->regenerate();
        session([
            'jwt_token' => $request->token,
            'user_id' => $user->getKey()
        ]);
        session()->save();
        
        return response()->json(['status' => 'success']);
        
    } catch (\Exception $e) {
        \Log::error("Set-session-token exception: " . $e->getMessage());
        return response()->json(['status' => 'error', 'message' => 'Server error'], 500);
    }
});

// Password reset routes
Route::post('forgot-password', [UserController::class, 'forgotPassword']);
Route::post('reset-password', [UserController::class, 'resetPassword']);

Route::get('/verify-session', function (Request $request) {
    $token = session('jwt_token');
    \Log::info('Verify session - Session ID: ' . session()->getId());
    \Log::info('JWT Token in session: ' . ($token ? 'Present' : 'Not present'));
    
    if ($token) {
        return response()->json(['status' => 'success', 'has_token' => true]);
    } else {
        return response()->json(['status' => 'error', 'has_token' => false], 401);
    }
});

// Budget Routes
Route::get('/budgets/{id}', function($id) {return view('budgets.show');})->middleware('auth');
Route::get('/budgets', function() {return view('budgets.index');})->middleware('auth');

// Transaction Routes
Route::get('/transactions', function() {return view('transactions.index');})->middleware('auth');

// Reports Routes
Route::get('/reports', function() {return view('reports.index');})->middleware('auth');
