<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class SubUser extends Model
{
    use HasFactory;
    
    protected $primaryKey = 'sub_user_id';
    
    protected $fillable = [
        'sub_user_name',       // Name of the authorized user
        'sub_payment_status',  // Whether this user has paid their share
        'credit_limit',        // Optional individual limit for this user
        'start_date',          // When this user was added to the card
        'end_date',            // When this user's access expires (if applicable)
        'budget_id',           // Which budget/card this user belongs to
    ];
    
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'credit_limit' => 'decimal:2',
    ];
    
    /**
     * Get the budget/card that this sub-user belongs to
     */
    public function budget()
    {
        return $this->belongsTo(Budget::class, 'budget_id');
    }
    
    /**
     * Get all transactions by this sub-user
     */
    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'sub_user_id');
    }
    
    /**
     * Calculate current balance used by this sub-user
     */
    public function getCurrentBalanceAttribute()
    {
        return $this->transactions()->sum('amount');
    }
    
    /**
     * Calculate available credit for this sub-user
     */
    public function getAvailableCreditAttribute()
    {
        $creditLimit = $this->credit_limit ?? 0;
        
        // Get all transactions for this sub-user
        $transactions = $this->transactions;
        
        if (!$transactions || $transactions->isEmpty()) {
            return $creditLimit;
        }
        
        // Calculate expenses and payments
        $totalExpenses = 0;
        $totalPayments = 0;
        
        foreach ($transactions as $transaction) {
            $amount = $transaction->amount;
            if ($amount < 0) {
                $totalExpenses += abs($amount);
            } else {
                $totalPayments += $amount;
            }
        }
        
        // Calculate used credit
        $usedCredit = $totalExpenses - $totalPayments;
        
        // If fully paid or overpaid, return full credit limit
        if ($usedCredit <= 0) {
            return $creditLimit;
        }
        
        // Otherwise return remaining credit
        return max(0, $creditLimit - $usedCredit);
    }

    // Add this method to calculate payment status directly on the model
    public function getSubPaymentStatusAttribute($value)
    {
        // Return the stored value if we're not accessing as an accessor
        if ($value !== null && !is_object($this->transactions)) {
            return $value;
        }
        
        // Calculate live status based on transactions
        // Get expenses (negative transactions)
        $expenses = Transaction::where('sub_user_id', $this->sub_user_id)
            ->where('amount', '<', 0)
            ->sum(DB::raw('ABS(amount)'));
        
        // Get payments (positive transactions)
        $payments = Transaction::where('sub_user_id', $this->sub_user_id)
            ->where('amount', '>', 0) 
            ->sum('amount');
        
        // No expenses means nothing to pay
        if ($expenses == 0) {
            return 'paid';
        }
        
        // Calculate the balance
        $balance = $expenses - $payments;
        
        // Determine status based on balance
        if ($balance <= 0) {
            return 'paid';
        } else if ($payments > 0) {
            return 'partially_paid';
        } else {
            return 'unpaid';
        }
    }
}