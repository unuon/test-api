<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Annotations as OA;

/**
 * @OA\Tag(
 *     name="Reports",
 *     description="Report generation endpoints"
 * )
 */
class ReportController extends Controller
{
    /**
     * @OA\Get(
     *     path="/reports/transactions",
     *     summary="Get transactions report data",
     *     description="Returns transaction data for reports based on filters",
     *     tags={"Reports"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="date_range",
     *         in="query",
     *         required=false,
     *         @OA\Schema(
     *             type="string",
     *             enum={"this_month", "last_month", "last_3_months", "last_6_months", "this_year", "custom"}
     *         ),
     *         description="Predefined date range"
     *     ),
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", format="date"),
     *         description="Start date for custom range (YYYY-MM-DD)"
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", format="date"),
     *         description="End date for custom range (YYYY-MM-DD)"
     *     ),
     *     @OA\Parameter(
     *         name="budget_id",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="integer"),
     *         description="Filter by specific budget ID"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Success",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="array", @OA\Items(
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="description", type="string"),
     *                 @OA\Property(property="amount", type="number"),
     *                 @OA\Property(property="transaction_date", type="string", format="date-time"),
     *                 @OA\Property(property="budget", type="object"),
     *                 @OA\Property(property="sub_user", type="object")
     *             ))
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function getTransactionsReport(Request $request)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Build query for transactions under budgets owned by the user
        $query = Transaction::whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->with(['budget', 'subUser']);
        
        // Apply date range filter
        if ($request->has('date_range')) {
            switch ($request->date_range) {
                case 'this_month':
                    $query->whereMonth('transaction_date', now()->month)
                          ->whereYear('transaction_date', now()->year);
                    break;
                case 'last_month':
                    $query->whereMonth('transaction_date', now()->subMonth()->month)
                          ->whereYear('transaction_date', now()->subMonth()->year);
                    break;
                case 'last_3_months':
                    $query->where('transaction_date', '>=', now()->subMonths(3));
                    break;
                case 'last_6_months':
                    $query->where('transaction_date', '>=', now()->subMonths(6));
                    break;
                case 'this_year':
                    $query->whereYear('transaction_date', now()->year);
                    break;
                // Custom range is handled below
            }
        } elseif ($request->has('start_date') && $request->has('end_date')) {
            // Custom date range
            $query->whereBetween('transaction_date', [$request->start_date, $request->end_date]);
        }
        
        // Filter by budget if specified
        if ($request->has('budget_id')) {
            $query->where('budget_id', $request->budget_id);
        }
        
        // Get transactions ordered by date
        $transactions = $query->orderBy('transaction_date', 'desc')->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $transactions
        ]);
    }

    /**
     * @OA\Get(
     *     path="/reports/summary",
     *     summary="Get summary report data",
     *     description="Returns summary statistics for reports",
     *     tags={"Reports"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="date_range",
     *         in="query",
     *         required=false,
     *         @OA\Schema(
     *             type="string",
     *             enum={"this_month", "last_month", "last_3_months", "last_6_months", "this_year", "custom"}
     *         ),
     *         description="Predefined date range"
     *     ),
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", format="date"),
     *         description="Start date for custom range (YYYY-MM-DD)"
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", format="date"),
     *         description="End date for custom range (YYYY-MM-DD)"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Success",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="total_expenses", type="number"),
     *                 @OA\Property(property="total_income", type="number"),
     *                 @OA\Property(property="net_balance", type="number"),
     *                 @OA\Property(property="transaction_count", type="integer"),
     *                 @OA\Property(property="by_budget", type="object"),
     *                 @OA\Property(property="by_month", type="object")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function getSummary(Request $request)
    {
        // Get the authenticated user
        $user = auth()->user() ?: $request->user;
        
        // Build query for transactions under budgets owned by the user
        $query = Transaction::whereHas('budget', function($query) use ($user) {
                $query->where('user_id', $user->user_id);
            });
        
        // Apply date range filter
        if ($request->has('date_range')) {
            switch ($request->date_range) {
                case 'this_month':
                    $query->whereMonth('transaction_date', now()->month)
                          ->whereYear('transaction_date', now()->year);
                    break;
                case 'last_month':
                    $query->whereMonth('transaction_date', now()->subMonth()->month)
                          ->whereYear('transaction_date', now()->subMonth()->year);
                    break;
                case 'last_3_months':
                    $query->where('transaction_date', '>=', now()->subMonths(3));
                    break;
                case 'last_6_months':
                    $query->where('transaction_date', '>=', now()->subMonths(6));
                    break;
                case 'this_year':
                    $query->whereYear('transaction_date', now()->year);
                    break;
                // Custom range is handled below
            }
        } elseif ($request->has('start_date') && $request->has('end_date')) {
            // Custom date range
            $query->whereBetween('transaction_date', [$request->start_date, $request->end_date]);
        }
        
        // Get transactions
        $transactions = $query->get();
        
        // Calculate summary metrics
        $totalExpenses = $transactions->where('amount', '<', 0)->sum(function($t) {
            return abs($t->amount);
        });
        
        $totalIncome = $transactions->where('amount', '>', 0)->sum('amount');
        $netBalance = $totalIncome - $totalExpenses;
        $transactionCount = $transactions->count();
        
        // Group by budget
        $byBudget = $transactions->groupBy('budget_id')
            ->map(function($items) {
                $budget = $items->first()->budget;
                return [
                    'budget_name' => $budget->budget_name,
                    'total_expenses' => $items->where('amount', '<', 0)->sum(function($t) {
                        return abs($t->amount);
                    }),
                    'total_income' => $items->where('amount', '>', 0)->sum('amount'),
                    'transaction_count' => $items->count()
                ];
            });
        
        // Group by month
        $byMonth = $transactions->groupBy(function($item) {
                return $item->transaction_date->format('Y-m');
            })
            ->map(function($items, $month) {
                $date = \Carbon\Carbon::createFromFormat('Y-m', $month);
                return [
                    'month' => $date->format('M Y'),
                    'total_expenses' => $items->where('amount', '<', 0)->sum(function($t) {
                        return abs($t->amount);
                    }),
                    'total_income' => $items->where('amount', '>', 0)->sum('amount'),
                    'transaction_count' => $items->count()
                ];
            })
            ->sortKeys();
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'total_expenses' => $totalExpenses,
                'total_income' => $totalIncome,
                'net_balance' => $netBalance,
                'transaction_count' => $transactionCount,
                'by_budget' => $byBudget,
                'by_month' => $byMonth
            ]
        ]);
    }
}