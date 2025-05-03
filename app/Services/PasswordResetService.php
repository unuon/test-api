<?php

namespace App\Services;

use App\Models\User;
use App\Models\PasswordResetToken;
use App\Mail\ResetPassword;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class PasswordResetService
{
    /**
     * Generate a reset token for the user
     */
    public function generateToken(User $user): PasswordResetToken
    {
        // Delete any existing tokens for this user
        PasswordResetToken::where('user_id', $user->getKey())->delete();
        
        // Create a new token
        return PasswordResetToken::create([
            'user_id' => $user->getKey(),
            'token' => Str::random(64),
            'expires_at' => Carbon::now()->addHour(), // Token valid for 1 hour
        ]);
    }
    
    /**
     * Send the password reset email to the user
     */
    public function sendResetLink(User $user): void
    {
        $token = $this->generateToken($user);
        $resetUrl = url('/reset-password/' . $token->token);
        
        Mail::to($user->email)->send(new ResetPassword($user, $resetUrl));
    }
    
    /**
     * Validate the password reset token
     */
    public function validateToken(string $token): ?User
    {
        $resetToken = PasswordResetToken::where('token', $token)
            ->where('expires_at', '>', Carbon::now())
            ->first();
            
        if (!$resetToken) {
            return null;
        }
        
        return $resetToken->user;
    }
    
    /**
     * Reset the user's password
     */
    public function resetPassword(string $token, string $newPassword): bool
    {
        $resetToken = PasswordResetToken::where('token', $token)
            ->where('expires_at', '>', Carbon::now())
            ->first();
            
        if (!$resetToken) {
            return false;
        }
        
        $user = $resetToken->user;
        $user->password = bcrypt($newPassword);
        $user->save();
        
        // Delete the token so it can't be used again
        $resetToken->delete();
        
        return true;
    }
}