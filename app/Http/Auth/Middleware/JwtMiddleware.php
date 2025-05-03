<?php

namespace App\Http\Auth\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Http\Auth\TokenDecoder;
use Symfony\Component\HttpFoundation\Response;

class JwtMiddleware
{
    protected $decoder;

    /**
     * Create a new middleware instance.
     *
     * @param TokenDecoder $decoder
     */
    public function __construct(TokenDecoder $decoder)
    {
        $this->decoder = $decoder;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next): Response
    {
        \Log::info('JWTMiddleware handling request to: ' . $request->path());
        
        // First try to get token from bearer
        $token = $request->bearerToken();
        
        // Then check session
        if (!$token) {
            $token = session('jwt_token');
        }
        
        if (!$token) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        
        // Validate token using your decoder service
        $user = $this->decoder->getUserFromToken($token);
        
        if (!$user) {
            if (!$request->expectsJson() && !$request->is('api/*')) {
                // Clear invalid session token if present
                if (session()->has('jwt_token')) {
                    session()->forget('jwt_token');
                }
                return redirect('/')->with('error', 'Invalid or expired session. Please log in again.');
            }
            
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid authentication token'
            ], 401);
        }
        
        // Set the authenticated user in the request
        $request->merge(['user' => $user]);
        
        // Attach user to request using Laravel's auth
        auth()->login($user);
        
        return $next($request);
    }
}