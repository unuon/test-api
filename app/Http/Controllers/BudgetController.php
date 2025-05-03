<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\SubUser;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Annotations as OA;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Tag(
 *     name="Budgets",
 *     description="Budget management endpoints"
 * )
 */
class BudgetController extends Controller
{
    /**
     * @OA\Get(
     *     path="/budgets",
     *     summary="Get all budgets for the authenticated user",
     *     tags={"Budgets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="List of budgets",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="array", @OA\Items(
     *                 @OA\Property(property="budget_id", type="integer"),
     *                 @OA\Property(property="budget_name", type="string"),
     *                 @OA\Property(property="payment_status", type="string"),
     *                 @OA\Property(property="payment_due_date", type="string", format="date"),
     *                 @OA\Property(property="current_balance", type="number"),
     *                 @OA\Property(property="total_limit", type="number")
     *             ))
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function index(Request $request)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Get all budgets for this user
        $budgets = Budget::where('user_id', $user->user_id)->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $budgets
        ]);
    }

    /**
     * @OA\Post(
     *     path="/budgets",
     *     summary="Create a new budget",
     *     tags={"Budgets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="budget_name", type="string", example="Family Credit Card"),
     *             @OA\Property(property="payment_due_date", type="string", format="date", example="2023-06-15"),
     *             @OA\Property(property="billing_cycle_start", type="string", format="date", example="2023-05-01"),
     *             @OA\Property(property="billing_cycle_end", type="string", format="date", example="2023-05-31"),
     *             @OA\Property(property="total_limit", type="number", example=5000)
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Budget created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Budget created successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="budget_id", type="integer"),
     *                 @OA\Property(property="budget_name", type="string"),
     *                 @OA\Property(property="payment_status", type="string"),
     *                 @OA\Property(property="total_limit", type="number")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=400, description="Validation error"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function store(Request $request)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'budget_name' => 'required|string|max:255',
            'payment_due_date' => 'nullable|date',
            'billing_cycle_start' => 'nullable|date',
            'billing_cycle_end' => 'nullable|date',
            'total_limit' => 'nullable|numeric|min:0'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 400);
        }
        
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'User not authenticated'
            ], 401);
        }

        // Create budget
        $budget = new Budget([
            'budget_name' => $request->budget_name,
            'payment_due_date' => $request->payment_due_date,
            'billing_cycle_start' => $request->billing_cycle_start,
            'billing_cycle_end' => $request->billing_cycle_end,
            'total_limit' => $request->total_limit ?? 0,
            'current_balance' => 0,
            'payment_status' => 'paid',
        ]);
        
        // Associate with user
        $budget->user_id = $user->user_id;
        $budget->save();
        
        return response()->json([
            'status' => 'success',
            'message' => 'Budget created successfully',
            'data' => $budget
        ], 201);
    }

    /**
     * @OA\Get(
     *     path="/budgets/{id}",
     *     summary="Get budget details including sub-users",
     *     tags={"Budgets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Budget details with sub-users",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="budget", type="object"),
     *                 @OA\Property(property="sub_users", type="array", @OA\Items())
     *             )
     *         )
     *     ),
     *     @OA\Response(response=404, description="Budget not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function show(Request $request, $id)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Find the budget
        $budget = Budget::where('budget_id', $id)
            ->where('user_id', $user->user_id)
            ->first();
        
        if (!$budget) {
            return response()->json([
                'status' => 'error',
                'message' => 'Budget not found'
            ], 404);
        }
        
        // Load related sub-users
        $subUsers = SubUser::where('budget_id', $budget->budget_id)
            ->with('transactions') // Load transactions relation
            ->get();
        
        // Or calculate available credit directly on the server:
        $subUsers = SubUser::where('budget_id', $budget->budget_id)
            ->get()
            ->map(function($subUser) {
                // Calculate available credit
                $subUser->available_credit = $subUser->getAvailableCreditAttribute();
                return $subUser;
            });
        
        // Calculate remaining credit
        $remainingCredit = $budget->total_limit - $budget->current_balance;
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'budget' => $budget,
                'remaining_credit' => $remainingCredit,
                'sub_users' => $subUsers
            ]
        ]);
    }

    /**
     * @OA\Put(
     *     path="/budgets/{id}",
     *     summary="Update a budget",
     *     tags={"Budgets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="budget_name", type="string"),
     *             @OA\Property(property="payment_status", type="string", enum={"paid", "unpaid", "partially_paid"}),
     *             @OA\Property(property="payment_due_date", type="string", format="date"),
     *             @OA\Property(property="total_limit", type="number")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Budget updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Budget updated successfully"),
     *             @OA\Property(property="data", type="object")
     *         )
     *     ),
     *     @OA\Response(response=400, description="Validation error"),
     *     @OA\Response(response=404, description="Budget not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function update(Request $request, $id)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'budget_name' => 'sometimes|string|max:255',
                'payment_status' => 'sometimes|in:paid,unpaid,partially_paid',
                'payment_due_date' => 'sometimes|nullable|date',
                'billing_cycle_start' => 'sometimes|nullable|date',
                'billing_cycle_end' => 'sometimes|nullable|date',
                'total_limit' => 'sometimes|numeric|min:0'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 400);
            }
            
            // Get the authenticated user
            $user = auth()->user() ?: $request->user;
            
            // Find the budget
            $budget = Budget::where('budget_id', $id)
                ->where('user_id', $user->user_id)
                ->first();
            
            if (!$budget) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Budget not found'
                ], 404);
            }
            
            // Update budget
            if ($request->has('budget_name')) {
                $budget->budget_name = $request->budget_name;
            }
            
            if ($request->has('payment_status')) {
                $budget->payment_status = $request->payment_status;
            }
            
            if ($request->has('payment_due_date')) {
                $budget->payment_due_date = $request->payment_due_date;
            }
            
            if ($request->has('billing_cycle_start')) {
                $budget->billing_cycle_start = $request->billing_cycle_start;
            }
            
            if ($request->has('billing_cycle_end')) {
                $budget->billing_cycle_end = $request->billing_cycle_end;
            }
            
            if ($request->has('total_limit')) {
                $budget->total_limit = $request->total_limit;
            }
            
            $budget->save();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Budget updated successfully',
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            \Log::error('Budget update error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update budget: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/budgets/{id}",
     *     summary="Delete a budget",
     *     tags={"Budgets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Budget deleted successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Budget deleted successfully")
     *         )
     *     ),
     *     @OA\Response(response=404, description="Budget not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function destroy(Request $request, $id)
    {
        try {
            // Get the authenticated user
            $user = auth()->user() ?: $request->user;
            
            // Find the budget
            $budget = Budget::where('budget_id', $id)
                ->where('user_id', $user->user_id)
                ->first();
            
            if (!$budget) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Budget not found'
                ], 404);
            }
            
            // Delete budget (cascade will delete sub-users and transactions)
            $budget->delete();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Budget deleted successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Budget deletion error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete budget: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/budgets/{id}/transactions",
     *     summary="Get all transactions for a budget",
     *     tags={"Budgets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of transactions for the budget",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="array", @OA\Items())
     *         )
     *     ),
     *     @OA\Response(response=404, description="Budget not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function getTransactions(Request $request, $id)
    {
        try {
            // Get the authenticated user
            $user = auth()->user() ?: $request->user;
            
            // Find the budget
            $budget = Budget::where('budget_id', $id)
                ->where('user_id', $user->user_id)
                ->first();
            
            if (!$budget) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Budget not found'
                ], 404);
            }
            
            // Get transactions
            $transactions = Transaction::where('budget_id', $budget->budget_id)
                ->with('subUser') // Include sub-user details
                ->orderBy('transaction_date', 'desc')
                ->get();
            
            return response()->json([
                'status' => 'success',
                'data' => $transactions
            ]);
        } catch (\Exception $e) {
            \Log::error('Transaction retrieval error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve transactions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/budgets/{id}/sub-users",
     *     summary="Add a sub-user to a budget",
     *     tags={"Budgets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="sub_user_name", type="string", example="John Doe"),
     *             @OA\Property(property="credit_limit", type="number", example=1000),
     *             @OA\Property(property="start_date", type="string", format="date", example="2023-05-01")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Sub-user added successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Sub-user added successfully"),
     *             @OA\Property(property="data", type="object")
     *         )
     *     ),
     *     @OA\Response(response=400, description="Validation error"),
     *     @OA\Response(response=404, description="Budget not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function addSubUser(Request $request, $id)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'sub_user_name' => 'required|string|max:255',
            'credit_limit' => 'nullable|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 400);
        }
        
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Find the budget
        $budget = Budget::where('budget_id', $id)
            ->where('user_id', $user->user_id)
            ->first();
        
        if (!$budget) {
            return response()->json([
                'status' => 'error',
                'message' => 'Budget not found'
            ], 404);
        }
        
        // Create sub-user
        $subUser = new SubUser([
            'sub_user_name' => $request->sub_user_name,
            'sub_payment_status' => 'paid',
            'credit_limit' => $request->credit_limit,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'budget_id' => $budget->budget_id
        ]);
        
        $subUser->save();
        
        return response()->json([
            'status' => 'success',
            'message' => 'Sub-user added successfully',
            'data' => $subUser
        ], 201);
    }

    /**
     * @OA\Post(
     *     path="/budgets/{id}/transactions",
     *     summary="Add a transaction to a budget",
     *     tags={"Budgets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="description", type="string", example="Grocery shopping"),
     *             @OA\Property(property="amount", type="number", example=-125.50),
     *             @OA\Property(property="transaction_date", type="string", format="date", example="2023-05-15"),
     *             @OA\Property(property="sub_user_id", type="integer", example=1)
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Transaction added successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Transaction added successfully"),
     *             @OA\Property(property="data", type="object")
     *         )
     *     ),
     *     @OA\Response(response=400, description="Validation error"),
     *     @OA\Response(response=404, description="Budget not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function addTransaction(Request $request, $id)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'description' => 'required|string|max:255',
                'amount' => 'required|numeric',
                'transaction_date' => 'required|date',
                'sub_user_id' => 'nullable|exists:sub_users,sub_user_id'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 400);
            }
            
            // Get the authenticated user
            $user = auth()->user() ?: $request->user;
            
            // Find the budget
            $budget = Budget::where('budget_id', $id)
                ->where('user_id', $user->user_id)
                ->first();
            
            if (!$budget) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Budget not found'
                ], 404);
            }
            
            // If no sub_user_id is provided, we should store it as null (Main Budget)
            if (!$request->sub_user_id) {
                // Create transaction with null sub_user_id
                $transaction = new Transaction([
                    'description' => $request->description,
                    'amount' => $request->amount,
                    'transaction_date' => $request->transaction_date,
                    'budget_id' => $budget->budget_id,
                    'sub_user_id' => null // Explicitly set to null for Main Budget
                ]);
                
                $transaction->save();
            } else {
                // Normal transaction with sub-user
                $transaction = new Transaction([
                    'description' => $request->description,
                    'amount' => $request->amount,
                    'transaction_date' => $request->transaction_date,
                    'budget_id' => $budget->budget_id,
                    'sub_user_id' => $request->sub_user_id
                ]);
                
                $transaction->save();
            }
            
            // Update budget balance
            if ($request->amount < 0) {
                $budget->current_balance += abs($request->amount);
            } else {
                $budget->current_balance -= $request->amount;
            }
            $budget->save();
            
            // Update budget payment status based on current balance
            if ($budget->current_balance <= 0) {
                $budget->payment_status = 'paid';
            } else if ($budget->current_balance > 0) {
                // Find if any payments have been made
                $hasPayments = Transaction::where('budget_id', $budget->budget_id)
                    ->where('amount', '>', 0)
                    ->exists();
                
                if ($hasPayments) {
                    $budget->payment_status = 'partially_paid';
                } else {
                    $budget->payment_status = 'unpaid';
                }
            }
            
            $budget->save();
            
            // If this transaction is for a sub-user, update their payment status too
            if ($transaction->sub_user_id) {
                $subUser = SubUser::findOrFail($transaction->sub_user_id);
                
                // Get total expenses for this sub-user
                $subUserExpenses = Transaction::where('sub_user_id', $subUser->sub_user_id)
                    ->where('amount', '<', 0)
                    ->sum(DB::raw('ABS(amount)'));
                
                // Get total payments for this sub-user
                $subUserPayments = Transaction::where('sub_user_id', $subUser->sub_user_id)
                    ->where('amount', '>', 0)
                    ->sum('amount');
                
                // Calculate net balance (amount used)
                $subUserBalance = $subUserExpenses - $subUserPayments;
                
                // If no expenses or all expenses have been paid off
                if ($subUserBalance <= 0) {
                    $subUser->sub_payment_status = 'paid';
                } else if ($subUserPayments > 0) {
                    $subUser->sub_payment_status = 'partially_paid';
                } else {
                    $subUser->sub_payment_status = 'unpaid';
                }
                
                $subUser->save();
            }
            
            return response()->json([
                'status' => 'success',
                'message' => 'Transaction added successfully',
                'data' => $transaction
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('Transaction creation error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to add transaction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the Main Budget sub-user for a budget
     */
    public function getMainBudget(Request $request, $id)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Find the budget and ensure it belongs to the authenticated user
        $budget = Budget::where('budget_id', $id)
            ->where('user_id', $user->user_id)
            ->first();
        
        if (!$budget) {
            return response()->json([
                'status' => 'error',
                'message' => 'Budget not found'
            ], 404);
        }
        
        // Find the Main Budget sub-user
        $mainBudget = SubUser::where('budget_id', $id)
            ->where('sub_user_name', 'Main Budget')
            ->first();
        
        if (!$mainBudget) {
            // Create a Main Budget sub-user if it doesn't exist
            $mainBudget = new SubUser([
                'sub_user_name' => 'Main Budget',
                'credit_limit' => $budget->total_limit,
                'start_date' => now(),
                'budget_id' => $budget->budget_id
            ]);
            $mainBudget->save();
        }
        
        return response()->json([
            'status' => 'success',
            'data' => $mainBudget
        ]);
    }
}