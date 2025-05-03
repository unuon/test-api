<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PasswordResetToken extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'user_id',
        'token',
        'expires_at',
    ];
    
    protected $casts = [
        'expires_at' => 'datetime',
    ];
    
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}