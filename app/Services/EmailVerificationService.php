<?php

namespace App\Services;

use App\Models\User;
use App\Models\EmailVerificationToken;
use App\Mail\VerifyEmail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class EmailVerificationService
{
    /**
     * Generate a verification token for the user
     */
    public function generateToken(User $user): EmailVerificationToken
    {
        // Delete any existing tokens for this user
        EmailVerificationToken::where('user_id', $user->getKey())->delete();
        
        // Create a new token
        return EmailVerificationToken::create([
            'user_id' => $user->getKey(), // This will use the proper primary key
            'token' => Str::random(64),
            'expires_at' => Carbon::now()->addHours(24), // Token valid for 24 hours
        ]);
    }
    
    /**
     * Send the verification email to the user
     */
    public function sendVerificationEmail(User $user): void
    {
        $token = $this->generateToken($user);
        $verificationUrl = url('/verify-email/' . $token->token);
        
        Mail::to($user->email)->send(new VerifyEmail($user, $verificationUrl));
    }
    
    /**
     * Verify the user's email with the provided token
     */
    public function verifyEmail(string $token): bool
    {
        $verificationToken = EmailVerificationToken::where('token', $token)
            ->where('expires_at', '>', Carbon::now())
            ->first();
            
        if (!$verificationToken) {
            return false;
        }
        
        $user = $verificationToken->user;
        $user->email_verified_at = Carbon::now();
        $user->save();
        
        // Token has been used, delete it
        $verificationToken->delete();
        
        return true;
    }
    
    /**
     * Resend verification email to user
     */
    public function resendVerificationEmail(string $email): bool
    {
        $user = User::where('email', $email)->first();
        
        if (!$user || $user->email_verified_at !== null) {
            return false;
        }
        
        $this->sendVerificationEmail($user);
        return true;
    }
}