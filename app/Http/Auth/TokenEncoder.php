<?php

namespace App\Http\Auth;

use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;
use Carbon\Carbon;
use Tymon\JWTAuth\Token;
use Illuminate\Support\Str;

class TokenEncoder
{
    /**
     * Generate a JWT token for a user
     *
     * @param User $user
     * @param int $expiresInMinutes
     * @return array
     */
    public function encode(User $user, int $expiresInMinutes = 43200) // Default 24 hours
    {
        // Create custom claims
        $customClaims = [
            'user_id' => $user->getKey(),
            'email' => $user->email,
            'name' => $user->name,
            'iat' => Carbon::now()->timestamp, // Issued at time
            'exp' => Carbon::now()->addMinutes($expiresInMinutes)->timestamp, // Expiration time
        ];

        // Generate token with custom claims
        $token = JWTAuth::customClaims($customClaims)->fromUser($user);

        // Calculate expiration date for database storage
        $expirationDate = Carbon::now()->addMinutes($expiresInMinutes);

        // Generate a random access token for database storage
        $randomAccessToken = Str::random(60);

        // Update user's token expiration in database
        $user->token_expiration = $expirationDate;
        $user->access_token = $randomAccessToken; // Store random token instead of JWT
        $user->save();

        return [
            'access_token' => $token, // Return JWT for API authentication
            'token_type' => 'Bearer',
            'expires_in' => $expiresInMinutes * 60, // Expiry in seconds
            'user' => [
                'id' => $user->getKey(),
                'name' => $user->name,
                'email' => $user->email
            ]
        ];
    }

    /**
     * Refresh an existing token
     *
     * @param string $token
     * @return array
     */
    public function refreshToken(string $token)
    {
        $newToken = JWTAuth::refresh($token);
        
        // Get the token's expiration time
        $payload = JWTAuth::manager()->decode(new Token($newToken));
        $expiresIn = $payload['exp'] - Carbon::now()->timestamp;
        
        return [
            'access_token' => $newToken,
            'token_type' => 'Bearer',
            'expires_in' => $expiresIn
        ];
    }
}