<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    use HasFactory;
    
    protected $primaryKey = 'budget_id';
    
    protected $fillable = [
        'budget_name',         // E.g., "Family Credit Card", "Business Card"
        'payment_status',      // Paid, Unpaid, Partially Paid
        'payment_due_date',    // When the card payment is due
        'billing_cycle_start', // Start of the billing period
        'billing_cycle_end',   // End of the billing period
        'total_limit',         // Total credit limit
        'current_balance',     // Current balance on the card
        'user_id',             // Primary owner of the budget/card
    ];
    
    protected $casts = [
        'payment_due_date' => 'date',
        'billing_cycle_start' => 'date',
        'billing_cycle_end' => 'date',
        'total_limit' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];
    
    /**
     * Get the user that owns the budget/card
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    /**
     * Get the sub-users associated with this budget/card
     */
    public function subUsers()
    {
        return $this->hasMany(SubUser::class, 'budget_id');
    }
    
    /**
     * Calculate remaining credit
     */
    public function getRemainingCreditAttribute()
    {
        return $this->total_limit - $this->current_balance;
    }
    
    /**
     * Get all transactions for this budget/card
     */
    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'budget_id');
    }
}