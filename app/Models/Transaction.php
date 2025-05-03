<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;
    
    // protected $primaryKey = 'transaction_id';
    
    protected $fillable = [
        'amount',
        'description',
        'transaction_date',
        'budget_id',
        'sub_user_id',
    ];
    
    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'datetime',
    ];
    
    /**
     * Get the budget this transaction belongs to
     */
    public function budget()
    {
        return $this->belongsTo(Budget::class, 'budget_id');
    }
    
    /**
     * Get the sub-user who made this transaction
     */
    public function subUser()
    {
        return $this->belongsTo(SubUser::class, 'sub_user_id');
    }
}