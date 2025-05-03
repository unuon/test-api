<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\SubUserController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\ReportController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('register', [UserController::class, 'register']);
Route::post('login', [UserController::class, 'login']);

// API routes for verification and password reset
Route::post('resend-verification', [UserController::class, 'resendVerification']);
Route::post('forgot-password', [UserController::class, 'forgotPassword']);
Route::post('reset-password', [UserController::class, 'resetPassword']);

// Protected routes
Route::middleware('jwt.auth')->group(function () {
    // User routes
    Route::post('logout', [UserController::class, 'logout']);
    Route::get('profile', [UserController::class, 'profile']);
    
    // Budget management routes
    Route::get('budgets', [BudgetController::class, 'index']);
    Route::post('budgets', [BudgetController::class, 'store']);
    Route::get('budgets/{id}', [BudgetController::class, 'show']);
    Route::put('budgets/{id}', [BudgetController::class, 'update']);
    Route::delete('budgets/{id}', [BudgetController::class, 'destroy']);
    Route::get('budgets/{id}/transactions', [BudgetController::class, 'getTransactions']);
    Route::post('budgets/{id}/sub-users', [BudgetController::class, 'addSubUser']);
    Route::post('budgets/{id}/transactions', [BudgetController::class, 'addTransaction']);
    Route::get('budgets/{id}/main-budget', [BudgetController::class, 'getMainBudget']);

    Route::get('/sub-users/count', [SubUserController::class, 'countActiveSubUsers']);

    // Sub-Users
    Route::get('/sub-users/{id}', [SubUserController::class, 'show']);
    Route::put('/sub-users/{id}', [SubUserController::class, 'update']);
    Route::delete('/sub-users/{id}', [SubUserController::class, 'destroy']);
    Route::post('/sub-users/{id}/transactions', [SubUserController::class, 'addTransaction']);
    Route::get('/sub-users/{id}/transactions-summary', [SubUserController::class, 'transactions']);
    Route::post('sub-users/{id}/update-status', [SubUserController::class, 'updatePaymentStatus']);
    Route::post('sub-users/update-all-statuses', [SubUserController::class, 'updatePaymentStatus']);
    Route::post('sub-users/batch-update-status', [SubUserController::class, 'batchUpdateStatus']);
    Route::post('sub-users/batch-data', [SubUserController::class, 'batchGetData']);
    Route::get('/sub-users/{subUser}/credit-status', [SubUserController::class, 'getCreditStatus']);

    // Transactions
    Route::get('/transactions/{id}', [TransactionController::class, 'show']);
    Route::put('/transactions/{id}', [TransactionController::class, 'update']);
    Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);
    Route::post('/transactions/{id}', [TransactionController::class, 'store']);
    
    // Reports
    Route::get('/reports/transactions', [ReportController::class, 'getTransactionsReport']);
    Route::get('/reports/summary', [ReportController::class, 'getSummary']);
});