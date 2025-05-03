<?php

namespace App\Http\Controllers;

use App\Models\SubUser;
use App\Models\Budget;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Annotations as OA;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Tag(
 *     name="SubUsers",
 *     description="Sub-user management endpoints"
 * )
 */
class SubUserController extends Controller
{
    /**
     * @OA\Get(
     *     path="/sub-users/{id}",
     *     summary="Get sub-user details with transactions",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Sub-user details with transactions",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="sub_user", type="object"),
     *                 @OA\Property(property="budget", type="object"),
     *                 @OA\Property(property="transactions", type="array", @OA\Items()),
     *                 @OA\Property(property="total_spent", type="number")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=404, description="Sub-user not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function show(Request $request, $id)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Find the sub-user and ensure it belongs to a budget owned by the authenticated user
        $subUser = SubUser::with('budget')
            ->whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where('sub_user_id', $id)
            ->first();
        
        if (!$subUser) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub-user not found'
            ], 404);
        }
        
        // Get transactions for this sub-user
        $transactions = Transaction::where('sub_user_id', $subUser->sub_user_id)
            ->orderBy('transaction_date', 'desc')
            ->get();
        
        // Calculate total amount spent
        $totalSpent = $transactions->sum('amount');
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'sub_user' => $subUser,
                'budget' => $subUser->budget,
                'transactions' => $transactions,
                'total_spent' => $totalSpent
            ]
        ]);
    }
    
    /**
     * @OA\Put(
     *     path="/sub-users/{id}",
     *     summary="Update a sub-user",
     *     tags={"SubUsers"},
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
     *             @OA\Property(property="sub_user_name", type="string"),
     *             @OA\Property(property="sub_payment_status", type="string", enum={"paid", "unpaid", "partially_paid"}),
     *             @OA\Property(property="credit_limit", type="number"),
     *             @OA\Property(property="end_date", type="string", format="date")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Sub-user updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Sub-user updated successfully"),
     *             @OA\Property(property="data", type="object")
     *         )
     *     ),
     *     @OA\Response(response=400, description="Validation error"),
     *     @OA\Response(response=404, description="Sub-user not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function update(Request $request, $id)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'sub_user_name' => 'sometimes|string|max:255',
            'sub_payment_status' => 'sometimes|in:paid,unpaid,partially_paid',
            'credit_limit' => 'sometimes|nullable|numeric|min:0',
            'end_date' => 'sometimes|nullable|date'
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
        
        // Find the sub-user and ensure it belongs to a budget owned by the authenticated user
        $subUser = SubUser::whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where('sub_user_id', $id)
            ->first();
        
        if (!$subUser) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub-user not found'
            ], 404);
        }
        
        // Update sub-user
        if ($request->has('sub_user_name')) {
            $subUser->sub_user_name = $request->sub_user_name;
        }
        
        if ($request->has('sub_payment_status')) {
            $subUser->sub_payment_status = $request->sub_payment_status;
        }
        
        if ($request->has('credit_limit')) {
            $subUser->credit_limit = $request->credit_limit;
        }
        
        if ($request->has('end_date')) {
            $subUser->end_date = $request->end_date;
        }
        
        $subUser->save();
        
        return response()->json([
            'status' => 'success',
            'message' => 'Sub-user updated successfully',
            'data' => $subUser
        ]);
    }
    
    /**
     * @OA\Delete(
     *     path="/sub-users/{id}",
     *     summary="Delete a sub-user",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Sub-user deleted successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Sub-user deleted successfully")
     *         )
     *     ),
     *     @OA\Response(response=404, description="Sub-user not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function destroy(Request $request, $id)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Find the sub-user and ensure it belongs to a budget owned by the authenticated user
        $subUser = SubUser::whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where('sub_user_id', $id)
            ->first();
        
        if (!$subUser) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub-user not found'
            ], 404);
        }
        
        // Delete sub-user (and related transactions via cascade)
        $subUser->delete();
        
        return response()->json([
            'status' => 'success',
            'message' => 'Sub-user deleted successfully'
        ]);
    }
    
    /**
     * @OA\Post(
     *     path="/sub-users/{id}/transactions",
     *     summary="Add a transaction for a sub-user",
     *     tags={"SubUsers"},
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
     *             @OA\Property(property="amount", type="number", example=125.50),
     *             @OA\Property(property="description", type="string", example="Dinner at Restaurant"),
     *             @OA\Property(property="transaction_date", type="string", format="date-time", example="2023-05-15T19:30:00")
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
     *     @OA\Response(response=404, description="Sub-user not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function addTransaction(Request $request, $id)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:255',
            'transaction_date' => 'required|date'
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
        
        // Find the sub-user and ensure it belongs to a budget owned by the authenticated user
        $subUser = SubUser::with('budget')
            ->whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where('sub_user_id', $id)
            ->first();
        
        if (!$subUser) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub-user not found'
            ], 404);
        }
        
        // Create transaction
        $transaction = new Transaction([
            'amount' => $request->amount,
            'description' => $request->description,
            'transaction_date' => $request->transaction_date,
            'budget_id' => $subUser->budget_id,
            'sub_user_id' => $subUser->sub_user_id
        ]);
        
        $transaction->save();
        
        // Update budget balance
        $budget = $subUser->budget;
        $budget->current_balance += $request->amount;
        $budget->save();
        
        return response()->json([
            'status' => 'success',
            'message' => 'Transaction added successfully',
            'data' => $transaction
        ], 201);
    }
    
    /**
     * @OA\Get(
     *     path="/sub-users/{id}/transactions",
     *     summary="Get all transactions for a sub-user",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of transactions for the sub-user",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="array", @OA\Items())
     *         )
     *     ),
     *     @OA\Response(response=404, description="Sub-user not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function getTransactions(Request $request, $id)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Find the sub-user and ensure it belongs to a budget owned by the authenticated user
        $subUser = SubUser::whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where('sub_user_id', $id)
            ->first();
        
        if (!$subUser) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub-user not found'
            ], 404);
        }
        
        // Get transactions
        $transactions = Transaction::where('sub_user_id', $subUser->sub_user_id)
            ->orderBy('transaction_date', 'desc')
            ->get();
        
        // Calculate total
        $total = $transactions->sum('amount');
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'transactions' => $transactions,
                'total' => $total
            ]
        ]);
    }

    /**
     * @OA\Get(
     *     path="/sub-users/count",
     *     summary="Count active sub-users",
     *     description="Returns the count of active sub-users across all budgets for the authenticated user. Active sub-users are those with start date in the past or today, and either no end date or end date in the future, excluding Main Budget entries.",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="count", type="integer", example=5)
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */

    public function countActiveSubUsers(Request $request)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Count sub-users that belong to the user's budgets and are active
        $activeSubUsers = SubUser::whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where(function($query) {
                $query->whereNull('end_date')  // No end date (ongoing)
                    ->orWhere('end_date', '>=', now()); // End date in the future
            })
            ->where('start_date', '<=', now()) // Start date is in the past or today
            ->where('sub_user_name', '!=', 'Main Budget') // Exclude the Main Budget
            ->count();
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'count' => $activeSubUsers
            ]
        ]);
    }

    /**
     * @OA\Get(
     *     path="/sub-users/{id}/transactions-summary",
     *     summary="Get all transactions for a sub-user with summary information",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of transactions with summary data",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="transactions", type="array", @OA\Items()),
     *                 @OA\Property(property="expenses", type="number"),
     *                 @OA\Property(property="payments", type="number"),
     *                 @OA\Property(property="balance", type="number")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=404, description="Sub-user not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function transactions(Request $request, $id)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Find the sub-user
        $subUser = SubUser::whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->where('sub_user_id', $id)
            ->first();
        
        if (!$subUser) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub-user not found'
            ], 404);
        }
        
        // Get transactions
        $transactions = Transaction::where('sub_user_id', $subUser->sub_user_id)
            ->orderBy('transaction_date', 'desc')
            ->get();
        
        // Calculate expense total
        $expenses = $transactions->where('amount', '<', 0)->sum('amount');
        $expenses = abs($expenses);
        
        // Calculate payment total
        $payments = $transactions->where('amount', '>', 0)->sum('amount');
        
        // Calculate remaining balance
        $balance = $expenses - $payments;
        
        // Update sub-user status based on balance
        if ($balance <= 0) {
            $subUser->sub_payment_status = 'paid';
        } else if ($payments > 0) {
            $subUser->sub_payment_status = 'partially_paid';
        } else {
            $subUser->sub_payment_status = 'unpaid';
        }
        $subUser->save();
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'transactions' => $transactions,
                'expenses' => $expenses,
                'payments' => $payments,
                'balance' => $balance
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

    /**
     * @OA\Post(
     *     path="/sub-users/{id}/update-status",
     *     summary="Update payment status for a specific sub-user",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Payment status updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Sub-user payment status updated"),
     *             @OA\Property(property="data", type="string", enum={"paid", "unpaid", "partially_paid"})
     *         )
     *     ),
     *     @OA\Response(response=404, description="Sub-user not found"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function updatePaymentStatus($id = null)
    {
        if ($id === null) {
            // If no ID provided, update all sub-users
            $subUsers = SubUser::all();
            foreach ($subUsers as $subUser) {
                $this->updateSingleSubUserStatus($subUser->sub_user_id);
            }
            return response()->json([
                'status' => 'success',
                'message' => 'All sub-user payment statuses updated'
            ]);
        } else {
            // Update specific sub-user
            $status = $this->updateSingleSubUserStatus($id);
            return response()->json([
                'status' => 'success',
                'message' => 'Sub-user payment status updated',
                'data' => $status
            ]);
        }
    }

    // Helper method to update a single sub-user's status
    private function updateSingleSubUserStatus($subUserId)
    {
        $subUser = SubUser::findOrFail($subUserId);
        
        // Get expenses (negative transactions)
        $expenses = Transaction::where('sub_user_id', $subUserId)
            ->where('amount', '<', 0)
            ->sum(DB::raw('ABS(amount)'));
        
        // Get payments (positive transactions)
        $payments = Transaction::where('sub_user_id', $subUserId)
            ->where('amount', '>', 0)
            ->sum('amount');
        
        // No expenses means nothing to pay
        if ($expenses == 0) {
            $subUser->sub_payment_status = 'paid';
        } else {
            // Calculate the balance
            $balance = $expenses - $payments;
            
            // Determine status based on balance
            if ($balance <= 0) {
                $subUser->sub_payment_status = 'paid';
            } else if ($payments > 0) {
                $subUser->sub_payment_status = 'partially_paid';
            } else {
                $subUser->sub_payment_status = 'unpaid';
            }
        }
        
        $subUser->save();
        return $subUser->sub_payment_status;
    }

    /**
     * @OA\Post(
     *     path="/sub-users/update-all-statuses",
     *     summary="Update payment status for all sub-users",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="All payment statuses updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="All sub-user payment statuses updated")
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    // This annotation refers to the same method but handles the case when no ID is provided

    /**
     * @OA\Post(
     *     path="/sub-users/batch-update-status",
     *     summary="Update payment status for multiple sub-users in a single request",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="sub_user_ids", type="array", @OA\Items(type="integer"))
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Batch status update successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="array", 
     *                 @OA\Items(
     *                     @OA\Property(property="sub_user_id", type="integer"),
     *                     @OA\Property(property="status", type="string", enum={"paid", "unpaid", "partially_paid"})
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function batchUpdateStatus(Request $request)
    {
        $subUserIds = $request->input('sub_user_ids', []);
        $results = [];
        
        foreach ($subUserIds as $subUserId) {
            $subUser = SubUser::find($subUserId);
            if ($subUser && $subUser->budget->user_id === auth()->id()) {
                // Calculate status logic
                $status = $this->calculateSubUserStatus($subUser);
                $results[] = [
                    'sub_user_id' => $subUserId,
                    'status' => $status
                ];
            }
        }
        
        return response()->json([
            'status' => 'success',
            'data' => $results
        ]);
    }

    /**
     * @OA\Post(
     *     path="/sub-users/batch-data",
     *     summary="Get data for multiple sub-users in a single request",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="sub_user_ids", type="array", @OA\Items(type="integer"))
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Batch data retrieval successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="array", 
     *                 @OA\Items(
     *                     @OA\Property(property="sub_user_id", type="integer"),
     *                     @OA\Property(property="status", type="string", enum={"paid", "unpaid", "partially_paid"}),
     *                     @OA\Property(property="available_credit", type="number"),
     *                     @OA\Property(property="credit_limit", type="number")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function batchGetData(Request $request)
    {
        $subUserIds = $request->input('sub_user_ids', []);
        $results = [];
        
        foreach ($subUserIds as $subUserId) {
            $subUser = SubUser::with('transactions')->find($subUserId);
            if ($subUser && $subUser->budget->user_id === auth()->id()) {
                // Calculate all needed data
                $status = $this->calculateSubUserStatus($subUser);
                $availableCredit = $this->calculateAvailableCredit($subUser);
                
                $results[] = [
                    'sub_user_id' => $subUserId,
                    'status' => $status,
                    'available_credit' => $availableCredit,
                    'credit_limit' => $subUser->credit_limit
                ];
            }
        }
        
        return response()->json([
            'status' => 'success',
            'data' => $results
        ]);
    }

    // Unified function to get consistent available credit
    private function getConsistentAvailableCredit($subUserId)
    {
        try {
            // Get transactions for this sub-user
            $transactionsResponse = $this->getTransactions($subUserId);
            
            // Get sub-user info for credit limit
            $subUserResponse = $this->show($subUserId);
            
            if ($transactionsResponse['status'] === 'success' && $subUserResponse['status'] === 'success') {
                $transactionsData = $transactionsResponse['data'];
                $transactions = $transactionsData['transactions'] ?? [];
                
                $subUserData = $subUserResponse['data'];
                $subUser = $subUserData['sub_user'];
                
                $creditLimit = floatval($subUser['credit_limit'] ?? 0);
                
                // Calculate available credit based on actual transactions
                $totalExpenses = 0;
                $totalPayments = 0;
                
                foreach ($transactions as $transaction) {
                    $transAmount = floatval($transaction['amount']);
                    if ($transAmount < 0) {
                        $totalExpenses += abs($transAmount);
                    } else {
                        $totalPayments += $transAmount;
                    }
                }
                
                // Calculate actual available credit
                $usedCredit = $totalExpenses - $totalPayments;
                $availableCredit = max(0, $creditLimit - $usedCredit);
                
                return $availableCredit;
            }
            
            throw new \Exception('Failed to get data');
        } catch (\Exception $e) {
            \Log::error('Error calculating available credit:', ['exception' => $e]);
            return 0; // Default to 0 if there's an error
        }
    }

    /**
     * @OA\Get(
     *     path="/sub-users/{subUser}/credit-status",
     *     summary="Get credit status for a sub-user",
     *     tags={"SubUsers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="subUser",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Credit status retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="credit_limit", type="number"),
     *             @OA\Property(property="used_credit", type="number"),
     *             @OA\Property(property="available_credit", type="number"),
     *             @OA\Property(property="sub_user_name", type="string"),
     *             @OA\Property(property="sub_user_id", type="integer")
     *         )
     *     ),
     *     @OA\Response(response=404, description="Sub-user not found"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="error", type="string"),
     *             @OA\Property(property="message", type="string")
     *         )
     *     )
     * )
     */
    public function getCreditStatus($subUserId)
    {
        try {
            // Get the sub-user with their credit limit
            $subUser = SubUser::findOrFail($subUserId);
            
            // Get all transactions for this sub-user
            $transactions = Transaction::where('sub_user_id', $subUserId)->get();
            
            // Calculate credit usage
            $totalExpenses = $transactions->where('amount', '<', 0)->sum(function($transaction) {
                return abs($transaction->amount);
            });
            
            $totalPayments = $transactions->where('amount', '>', 0)->sum('amount');
            
            // Calculate used and available credit
            $usedCredit = $totalExpenses - $totalPayments;
            $availableCredit = max(0, $subUser->credit_limit - $usedCredit);
            
            // Return all necessary information in a single response
            return response()->json([
                'credit_limit' => $subUser->credit_limit,
                'used_credit' => $usedCredit,
                'available_credit' => $availableCredit,
                'sub_user_name' => $subUser->sub_user_name,
                'sub_user_id' => $subUser->sub_user_id
            ]);
        } catch (\Exception $e) {
            // Log the specific error for debugging
            \Log::error('Credit status calculation failed', [
                'sub_user_id' => $subUserId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to get credit status', 
                'message' => $e->getMessage()
            ], 500);
        }
    }
}