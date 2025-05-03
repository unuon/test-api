<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\SubUser;
use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Annotations as OA;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Tag(
 *     name="Transactions",
 *     description="Transaction management endpoints"
 * )
 */
class TransactionController extends Controller
{
    /**
     * @OA\Get(
     *     path="/transactions",
     *     summary="Get all transactions for the authenticated user",
     *     tags={"Transactions"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of transactions",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="array", @OA\Items()),
     *             @OA\Property(property="total", type="number")
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function index(Request $request)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Set up query
        $query = Transaction::whereHas('budget', function($query) use ($user) {
            $query->where('user_id', $user->user_id);
        })->with(['budget', 'subUser']);
        
        // Apply date filters if provided
        if ($request->has('start_date')) {
            $query->where('transaction_date', '>=', $request->start_date);
        }
        
        if ($request->has('end_date')) {
            $query->where('transaction_date', '<=', $request->end_date);
        }
        
        // Get transactions
        $transactions = $query->orderBy('transaction_date', 'desc')->get();
        
        // Calculate total
        $total = $transactions->sum('amount');
        
        return response()->json([
            'status' => 'success',
            'data' => $transactions,
            'total' => $total
        ]);
    }

    /**
     * @OA\Get(
     *     path="/transactions/{id}",
     *     summary="Get transaction details",
     *     tags={"Transactions"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Transaction details",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="object")
     *         )
     *     ),
     *     @OA\Response(response=404, description="Transaction not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function show(Request $request, $id)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Find the transaction and ensure it belongs to a budget owned by the authenticated user
        $transaction = Transaction::with(['budget', 'subUser'])
            ->whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where('id', $id)
            ->first();
        
        if (!$transaction) {
            return response()->json([
                'status' => 'error',
                'message' => 'Transaction not found'
            ], 404);
        }
        
        return response()->json([
            'status' => 'success',
            'data' => $transaction
        ]);
    }

    /**
     * @OA\Post(
     *     path="/transactions",
     *     summary="Create a new transaction",
     *     tags={"Transactions"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="amount", type="number", example=125.50),
     *             @OA\Property(property="description", type="string", example="Grocery shopping"),
     *             @OA\Property(property="transaction_date", type="string", format="date-time", example="2023-05-15T19:30:00"),
     *             @OA\Property(property="budget_id", type="integer", example=1),
     *             @OA\Property(property="sub_user_id", type="integer", example=1)
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Transaction created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Transaction created successfully"),
     *             @OA\Property(property="data", type="object")
     *         )
     *     ),
     *     @OA\Response(response=400, description="Validation error"),
     *     @OA\Response(response=404, description="Budget or sub-user not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function store(Request $request)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:255',
            'transaction_date' => 'required|date',
            'budget_id' => 'required|exists:budgets,budget_id',
            'sub_user_id' => 'nullable|exists:sub_users,sub_user_id'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 400);
        }
        
        // Get the budget
        $budget = Budget::findOrFail($request->budget_id);
        
        // If it's an expense (negative amount), validate against budget limit
        if ($request->amount < 0) {
            // Check if this would exceed the total budget limit
            $currentExpenses = Transaction::where('budget_id', $budget->budget_id)
                ->where('amount', '<', 0)
                ->sum(DB::raw('ABS(amount)'));
            
            $currentPayments = Transaction::where('budget_id', $budget->budget_id)
                ->where('amount', '>', 0)
                ->sum('amount');
            
            $currentBalance = $currentExpenses - $currentPayments;
            $newBalance = $currentBalance + abs($request->amount);
            
            // Strictly enforce the budget limit
            if ($newBalance > $budget->total_limit) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This expense would exceed the budget total limit'
                ], 400);
            }
            
            // If it's for a sub-user, also check their credit limit
            if ($request->sub_user_id) {
                $subUser = SubUser::findOrFail($request->sub_user_id);
                
                if ($subUser->credit_limit > 0) {
                    $subUserExpenses = Transaction::where('sub_user_id', $subUser->sub_user_id)
                        ->where('amount', '<', 0)
                        ->sum(DB::raw('ABS(amount)'));
                    
                    $subUserPayments = Transaction::where('sub_user_id', $subUser->sub_user_id)
                        ->where('amount', '>', 0)
                        ->sum('amount');
                    
                    $subUserBalance = $subUserExpenses - $subUserPayments;
                    $newSubUserBalance = $subUserBalance + abs($request->amount);
                    
                    // Strictly enforce the sub-user credit limit
                    if ($newSubUserBalance > $subUser->credit_limit) {
                        return response()->json([
                            'status' => 'error',
                            'message' => 'This expense would exceed the sub-user\'s credit limit'
                        ], 400);
                    }
                }
            }
        }
        
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Check if the budget belongs to the user
        $budget = Budget::where('budget_id', $request->budget_id)
            ->where('user_id', $user->user_id)
            ->first();
        
        if (!$budget) {
            return response()->json([
                'status' => 'error',
                'message' => 'Budget not found'
            ], 404);
        }
        
        // Check if the sub-user belongs to the budget
        $subUser = SubUser::where('sub_user_id', $request->sub_user_id)
            ->where('budget_id', $request->budget_id)
            ->first();
        
        if (!$subUser) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub-user not found or does not belong to this budget'
            ], 404);
        }
        
        // Create transaction
        $transaction = new Transaction([
            'amount' => $request->amount,
            'description' => $request->description,
            'transaction_date' => $request->transaction_date,
            'budget_id' => $request->budget_id,
            'sub_user_id' => $request->sub_user_id
        ]);
        
        DB::beginTransaction();
        try {
            $transaction->save();
            
            // Update budget balance
            $this->recalculateBudgetBalance($transaction->budget_id);
            
            // Update sub-user status if applicable
            if ($transaction->sub_user_id) {
                $this->updateSubUserStatus($transaction->sub_user_id);
            }
            
            DB::commit();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Transaction added successfully',
                'data' => $transaction
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to add transaction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Put(
     *     path="/transactions/{id}",
     *     summary="Update a transaction",
     *     tags={"Transactions"},
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
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="transaction_date", type="string", format="date-time"),
     *             @OA\Property(property="sub_user_id", type="integer")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Transaction updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Transaction updated successfully"),
     *             @OA\Property(property="data", type="object")
     *         )
     *     ),
     *     @OA\Response(response=400, description="Validation error"),
     *     @OA\Response(response=404, description="Transaction not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function update(Request $request, $id)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'amount' => 'sometimes|numeric', // Allow both positive and negative values
            'description' => 'sometimes|string|max:255',
            'transaction_date' => 'sometimes|date',
            'sub_user_id' => 'sometimes|nullable' // Allow null for Main Budget
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
        
        // Find the transaction and ensure it belongs to a budget owned by the authenticated user
        $transaction = Transaction::with(['budget', 'subUser'])
            ->whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where('id', $id)
            ->first();
        
        if (!$transaction) {
            return response()->json([
                'status' => 'error',
                'message' => 'Transaction not found'
            ], 404);
        }
        
        // If this is an expense and being assigned to a sub-user, check available credit
        if ($request->has('amount') && $request->amount < 0 && 
            $request->has('sub_user_id') && $request->sub_user_id) {
            
            $subUser = SubUser::findOrFail($request->sub_user_id);
            
            // Get all transactions for this sub-user (except the current one)
            $otherTransactions = Transaction::where('sub_user_id', $subUser->sub_user_id)
                ->where('id', '!=', $id)
                ->get();
            
            // Calculate expenses and payments
            $totalExpenses = 0;
            $totalPayments = 0;
            
            foreach ($otherTransactions as $t) {
                if ($t->amount < 0) {
                    $totalExpenses += abs($t->amount);
                } else {
                    $totalPayments += $t->amount;
                }
            }
            
            // Calculate remaining credit
            $usedCredit = $totalExpenses - $totalPayments;
            $availableCredit = max(0, $subUser->credit_limit - $usedCredit);
            
            // Check if this expense would exceed available credit
            if (abs($request->amount) > $availableCredit) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This expense exceeds the available credit for this sub-user'
                ], 400);
            }
        }
        
        // Store old amount for budget balance adjustment
        $oldAmount = $transaction->amount;
        
        // Update transaction fields
        if ($request->has('description')) {
            $transaction->description = $request->description;
        }
        
        if ($request->has('amount')) {
            $transaction->amount = $request->amount;
        }
        
        if ($request->has('transaction_date')) {
            $transaction->transaction_date = $request->transaction_date;
        }
        
        // Handle sub_user_id explicitly to support null values
        if ($request->has('sub_user_id')) {
            // Set to null for Main Budget (handles both null and empty string)
            if ($request->sub_user_id === null || $request->sub_user_id === '') {
                $transaction->sub_user_id = null;
            } else {
                // Verify sub-user belongs to the budget
                $subUser = SubUser::where('sub_user_id', $request->sub_user_id)
                    ->where('budget_id', $transaction->budget_id)
                    ->first();
                    
                if (!$subUser) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Sub-user not found or does not belong to this budget'
                    ], 404);
                }
                
                $transaction->sub_user_id = $request->sub_user_id;
            }
        }
        
        // After updating the transaction, force a recalculation
        DB::beginTransaction();
        try {
            // Save the changes
            $transaction->save();
            
            // Update budget balance
            $this->recalculateBudgetBalance($transaction->budget_id);
            
            // Update sub-user status if applicable
            if ($transaction->sub_user_id) {
                $this->updateSubUserStatus($transaction->sub_user_id);
            }
            
            DB::commit();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Transaction updated successfully',
                'data' => $transaction
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update transaction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/transactions/{id}",
     *     summary="Delete a transaction",
     *     tags={"Transactions"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Transaction deleted successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Transaction deleted successfully")
     *         )
     *     ),
     *     @OA\Response(response=404, description="Transaction not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function destroy(Request $request, $id)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Find the transaction and ensure it belongs to a budget owned by the authenticated user
        $transaction = Transaction::with('budget')
            ->whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where('id', $id)
            ->first();
        
        if (!$transaction) {
            return response()->json([
                'status' => 'error',
                'message' => 'Transaction not found'
            ], 404);
        }
        
        DB::beginTransaction();
        try {
            $budgetId = $transaction->budget_id;
            $oldSubUserId = $transaction->sub_user_id;
            
            // Delete transaction
            $transaction->delete();
            
            // Update budget balance
            $this->recalculateBudgetBalance($budgetId);
            
            // Update sub-user status if applicable
            if ($oldSubUserId) {
                $this->updateSubUserStatus($oldSubUserId);
            }
            
            DB::commit();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Transaction deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete transaction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/transactions/summary",
     *     summary="Get transaction summary statistics",
     *     tags={"Transactions"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="budget_id",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Transaction summary",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="total_spent", type="number"),
     *                 @OA\Property(property="transaction_count", type="integer"),
     *                 @OA\Property(property="average_transaction", type="number"),
     *                 @OA\Property(property="by_budget", type="object"),
     *                 @OA\Property(property="by_sub_user", type="object"),
     *                 @OA\Property(property="by_month", type="object")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function summary(Request $request)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Set up base query for all transactions of this user
        $query = Transaction::whereHas('budget', function($query) use ($user) {
            $query->where('user_id', $user->user_id);
        })->with(['budget', 'subUser']);
        
        // Apply filters if provided
        if ($request->has('start_date')) {
            $query->where('transaction_date', '>=', $request->start_date);
        }
        
        if ($request->has('end_date')) {
            $query->where('transaction_date', '<=', $request->end_date);
        }
        
        if ($request->has('budget_id')) {
            $query->where('budget_id', $request->budget_id);
        }
        
        // Get all filtered transactions
        $transactions = $query->get();
        
        // Calculate summary statistics
        $totalSpent = $transactions->sum('amount');
        $transactionCount = $transactions->count();
        $averageTransaction = $transactionCount > 0 ? $totalSpent / $transactionCount : 0;
        
        // Group by budget
        $byBudget = $transactions->groupBy('budget_id')
            ->map(function ($items, $key) {
                $budget = $items->first()->budget;
                return [
                    'budget_name' => $budget->budget_name,
                    'total' => $items->sum('amount'),
                    'count' => $items->count()
                ];
            });
        
        // Group by sub-user
        $bySubUser = $transactions->groupBy('sub_user_id')
            ->map(function ($items, $key) {
                $subUser = $items->first()->subUser;
                return [
                    'sub_user_name' => $subUser->sub_user_name,
                    'total' => $items->sum('amount'),
                    'count' => $items->count()
                ];
            });
        
        // Group by month
        $byMonth = $transactions->groupBy(function ($item) {
            return $item->transaction_date->format('Y-m');
        })->map(function ($items, $key) {
            return [
                'month' => $key,
                'total' => $items->sum('amount'),
                'count' => $items->count()
            ];
        })->sortKeys();
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'total_spent' => $totalSpent,
                'transaction_count' => $transactionCount,
                'average_transaction' => $averageTransaction,
                'by_budget' => $byBudget,
                'by_sub_user' => $bySubUser,
                'by_month' => $byMonth
            ]
        ]);
    }

    private function updateSubUserStatus($subUserId)
    {
        $subUser = SubUser::findOrFail($subUserId);
        
        // Get all transactions for this sub-user
        $expenses = Transaction::where('sub_user_id', $subUserId)
            ->where('amount', '<', 0)
            ->sum(DB::raw('ABS(amount)'));
        
        $payments = Transaction::where('sub_user_id', $subUserId)
            ->where('amount', '>', 0)
            ->sum('amount');
        
        // Calculate net balance
        $netBalance = $expenses - $payments;
        
        // If payments fully cover or exceed expenses, status should be PAID
        if ($netBalance <= 0) {
            $subUser->sub_payment_status = 'paid';
        } 
        // If there are some payments but not enough to cover all expenses
        else if ($payments > 0) {
            $subUser->sub_payment_status = 'partially_paid';
        } 
        // If no payments at all
        else {
            $subUser->sub_payment_status = 'unpaid';
        }
        
        $subUser->save();
        
        return $subUser;
    }

    private function recalculateBudgetBalance($budgetId)
    {
        $budget = Budget::findOrFail($budgetId);
        
        // Calculate total expenses for the main budget only (where sub_user_id is null)
        $mainBudgetExpenses = Transaction::where('budget_id', $budgetId)
            ->whereNull('sub_user_id')
            ->where('amount', '<', 0)
            ->sum(DB::raw('ABS(amount)'));
        
        // Calculate total payments for the main budget only
        $mainBudgetPayments = Transaction::where('budget_id', $budgetId)
            ->whereNull('sub_user_id')
            ->where('amount', '>', 0)
            ->sum('amount');
        
        // Set current balance (we're only considering main budget transactions here)
        $budget->current_balance = $mainBudgetExpenses - $mainBudgetPayments;
        
        // Update payment status based on the main budget balance only
        if ($budget->current_balance <= 0) {
            $budget->payment_status = 'paid';
        } else if ($mainBudgetPayments > 0) {
            $budget->payment_status = 'partially_paid';
        } else {
            $budget->payment_status = 'unpaid';
        }
        
        $budget->save();
        
        return $budget;
    }

    private function recalculateSubUserStatus($subUserId)
    {
        $subUser = SubUser::findOrFail($subUserId);
        
        // Calculate total expenses for this sub-user
        $expenses = Transaction::where('sub_user_id', $subUserId)
            ->where('amount', '<', 0)
            ->sum(DB::raw('ABS(amount)'));
        
        // Calculate total payments for this sub-user
        $payments = Transaction::where('sub_user_id', $subUserId)
            ->where('amount', '>', 0)
            ->sum('amount');
        
        // Calculate net balance
        $balance = $expenses - $payments;
        
        // Update payment status based on balance
        if ($balance <= 0) {
            $subUser->sub_payment_status = 'paid';
        } else if ($payments > 0) {
            $subUser->sub_payment_status = 'partially_paid';
        } else {
            $subUser->sub_payment_status = 'unpaid';
        }
        
        $subUser->save();
        
        return $subUser;
    }
}