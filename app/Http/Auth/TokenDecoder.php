<?php

namespace App\Http\Auth;

use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Tymon\JWTAuth\Exceptions\JWTException;
use App\Models\User;

class TokenDecoder
{
    /**
     * Decode and validate a JWT token
     *
     * @param string $token
     * @return array|null
     */
    public function decode(string $token)
    {
        try {
            // Attempt to decode the token
            $payload = JWTAuth::getPayload($token)->toArray();
            return $payload;
        } catch (TokenExpiredException $e) {
            return ['error' => 'Token has expired', 'code' => 401];
        } catch (TokenInvalidException $e) {
            return ['error' => 'Token is invalid', 'code' => 401];
        } catch (JWTException $e) {
            return ['error' => 'Token is absent or malformed', 'code' => 401];
        }
    }

    /**
     * Get the user from a token
     *
     * @param string $token
     * @return User|null
     */
    
    public function getUserFromToken($token)
    {
        try {
            // Decode the token and get the user_id from the payload
            $payload = JWTAuth::setToken($token)->getPayload();
            
            // Try to get the user ID from the payload
            $userId = $payload->get('user_id');
            
            // Check if user_id is null or empty
            if (empty($userId) || $userId === null) {
                // Get email as fallback
                $email = $payload->get('email');
                
                if (empty($email)) {
                    \Log::error("TokenDecoder: Both user_id and email are missing from token payload");
                    return null;
                }
                
                // Find user by email
                $user = User::where('email', $email)->first();
                
                if (!$user) {
                    \Log::warning("TokenDecoder: User not found for email: {$email}");
                    return null;
                }
                
                \Log::info("TokenDecoder: Found user by email: {$user->name} (ID: {$user->id})");
                return $user;
            }
            
            // If we have a valid user_id, find the user by ID
            $user = User::find($userId);
            
            if (!$user) {
                \Log::warning("TokenDecoder: User not found for id: {$userId}");
                return null;
            }
            
            \Log::info("TokenDecoder: Found user by id: {$user->name} (ID: {$user->id})");
            return $user;
        } catch (\Exception $e) {
            // Log error
            \Log::error('Token decoding error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Check if token is valid
     *
     * @param string $token
     * @return bool
     */
    public function isValid(string $token)
    {
        try {
            // Try to parse and validate the token
            JWTAuth::parseToken()->authenticate();
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Check if token is expired
     *
     * @param string $token
     * @return bool
     */

    public function isExpired(string $token)
    {
        try {
            JWTAuth::parseToken()->authenticate();
            return false;
        } catch (TokenExpiredException $e) {
            return true;
        } catch (\Exception $e) {
            // For other exceptions, we can't determine if it's expired
            return false;
        }
    }
}