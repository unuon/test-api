<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Http\Auth\TokenEncoder;
use OpenApi\Annotations as OA;
use App\Services\EmailVerificationService;
use App\Services\PasswordResetService;

/**
 * @OA\Tag(
 *     name="Authentication",
 *     description="Authentication operations"
 * )
 */

class UserController extends Controller
{
    protected $tokenEncoder;

    public function __construct(TokenEncoder $tokenEncoder)
    {
        $this->tokenEncoder = $tokenEncoder;
    }

    /**
     * @OA\Post(
     *     path="/register",
     *     operationId="registerUser",
     *     summary="Register a new user",
     *     description="Registers a new user with the provided details",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="John Doe"),
     *             @OA\Property(property="email", type="string", format="email", example="john@example.com"),
     *             @OA\Property(property="password", type="string", format="password", example="password123"),
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="User registered successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="token", type="string", example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="error"),
     *             @OA\Property(property="message", type="string", example="The given data was invalid.")
     *         )
     *     )
     * )
     */

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:user',
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Send verification email
        $verificationService = app(EmailVerificationService::class);
        $verificationService->sendVerificationEmail($user);

        // Generate token but don't return it in the response
        // The user needs to verify their email first
        $tokenResponse = $this->tokenEncoder->encode($user);
        
        return response()->json([
            'status' => 'success',
            'message' => 'User registered successfully. Please check your email to verify your account.',
        ]);
    }

    /**
     * @OA\Post(
     *     path="/resend-verification",
     *     operationId="resendVerificationEmail",
     *     summary="Resend verification email",
     *     description="Resends the verification email to a registered user",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="email", type="string", format="email", example="john@example.com"),
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Verification email resent successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Verification email has been resent.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Error resending verification email",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="error"),
     *             @OA\Property(property="message", type="string", example="Unable to resend verification email. Email may already be verified or user does not exist.")
     *         )
     *     )
     * )
     */

    public function resendVerification(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|string|email',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid email address'
                ], 400);
            }

            $verificationService = app(EmailVerificationService::class);
            $result = $verificationService->resendVerificationEmail($request->email);
            
            if ($result) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Verification email has been resent.'
                ]);
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unable to resend verification email. Email may already be verified or user does not exist.'
                ], 400);
            }
        } catch (\Exception $e) {
            // Log the error
            \Log::error('Resend verification error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/login",
     *     operationId="loginUser",
     *     summary="Login a user",
     *     description="Logs in a user with the provided email and password",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="email", type="string", format="email", example="john@example.com"),
     *             @OA\Property(property="password", type="string", format="password", example="password123"),
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="User logged in successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="token", type="string", example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="error"),
     *             @OA\Property(property="message", type="string", example="The given data was invalid.")
     *         )
     *     )
     * )
     */

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        // Check email
        $user = User::where('email', $request->email)->first();
        
        // Check if user exists
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'User not found'
            ], 401);
        }
        
        // Check if email is verified
        if ($user->email_verified_at === null) {
            return response()->json([
                'status' => 'error',
                'message' => 'Email not verified',
                'email_verified_at' => null
            ], 401);
        }
        
        // Check password
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid credentials'
            ], 401);
        }
        
        // Use TokenEncoder to generate token and update user
        $tokenResponse = $this->tokenEncoder->encode($user);
        
        return response()->json(array_merge(
            ['status' => 'success'],
            $tokenResponse
        ));
    }
    
    /**
     * @OA\Post(
     *     path="/logout",
     *     operationId="logoutUser",
     *     summary="Logout a user",
     *     description="Logs out a user by invalidating their token",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="User logged out successfully"
     *     )
     * )
     */

    public function logout(Request $request)
    {
        // Get authenticated user
        $user = $request->user;
        
        // Invalidate token
        $user->access_token = null;
        $user->token_expiration = null;
        $user->save();
        
        return response()->json([
            'status' => 'success',
            'message' => 'Successfully logged out'
        ]);
    }

    /**
     * @OA\Get(
     *     path="/profile",
     *     operationId="getUserProfile",
     *     summary="Get user profile",
     *     description="Returns the profile of the authenticated user",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="User profile retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="user", type="object",
     *                 @OA\Property(property="id", type="integer", example="1"),
     *                 @OA\Property(property="name", type="string", example="John Doe"),
     *                 @OA\Property(property="email", type="string", format="email", example="john@example.com"),
     *                 @OA\Property(property="created_at", type="string", format="date-time", example="2023-04-01T12:00:00")
     *             )
     *         )
     *     )
     * )
     */

    public function profile(Request $request)
    {
        // Get authenticated user from request (set by middleware)
        $user = $request->user;
        
        return response()->json([
            'status' => 'success',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at->toDateTimeString()
            ]
        ]);
    }

    /**
     * @OA\Post(
     *     path="/forgot-password",
     *     summary="Request password reset link",
     *     description="Sends a password reset link to the user's email",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="email", type="string", format="email", example="john@example.com")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Password reset link sent successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Password reset link has been sent to your email.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Email not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="error"),
     *             @OA\Property(property="message", type="string", example="We couldn't find a user with that email address.")
     *         )
     *     )
     * )
     */
    public function forgotPassword(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|string|email',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid email address'
                ], 400);
            }

            $user = User::where('email', $request->email)->first();

            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'We couldn\'t find a user with that email address.'
                ], 400);
            }

            $passwordResetService = app(PasswordResetService::class);
            $passwordResetService->sendResetLink($user);

            return response()->json([
                'status' => 'success',
                'message' => 'Password reset link has been sent to your email.'
            ]);
        } catch (\Exception $e) {
            // Log the error
            \Log::error('Forgot password error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/reset-password",
     *     summary="Reset password",
     *     description="Resets the user's password using the token sent to their email",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="token", type="string", example="abcdef123456"),
     *             @OA\Property(property="password", type="string", format="password", example="newpassword123"),
     *             @OA\Property(property="password_confirmation", type="string", format="password", example="newpassword123")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Password reset successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Your password has been reset successfully.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Invalid token or password validation failed",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="error"),
     *             @OA\Property(property="message", type="string", example="Invalid or expired token.")
     *         )
     *     )
     * )
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Password must be at least 8 characters and match the confirmation.'
            ], 400);
        }

        $passwordResetService = app(PasswordResetService::class);
        $result = $passwordResetService->resetPassword($request->token, $request->password);

        if (!$result) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid or expired token. Please request a new password reset link.'
            ], 400);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Your password has been reset successfully. You can now log in with your new password.'
        ]);
    }
}