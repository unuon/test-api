<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Budget Tracker</title>
    <link rel="stylesheet" href="{{ asset('css/reset-password.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <header class="navbar">
        <div class="container">
            <h1>Budget<span>Tracker</span></h1>
            <button class="theme-toggle" id="themeToggle">
                <i class="fas fa-moon"></i>
            </button>
        </div>
    </header>

    <div class="auth-container">
        <div class="auth-card">
            <div class="card-header">
                <h1>Set New Password</h1>
            </div>
            
            <div class="card-body">
                @if(session('error'))
                <div class="alert alert-danger">
                    {{ session('error') }}
                </div>
                @endif
                
                @if(session('success'))
                <div class="alert alert-success">
                    {{ session('success') }}
                </div>
                @endif
                
                <p class="auth-description">Enter your new password below.</p>
                
                <form id="resetPasswordForm">
                    @csrf
                    <input type="hidden" name="token" value="{{ $token }}">
                    
                    <div class="form-group">
                        <label for="password">New Password</label>
                        <input type="password" id="password" name="password" class="form-control" placeholder="••••••••" required>
                        <div class="invalid-feedback">
                            Password must be at least 8 characters.
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="password_confirmation">Confirm Password</label>
                        <input type="password" id="password_confirmation" name="password_confirmation" class="form-control" placeholder="••••••••" required>
                        <div class="invalid-feedback">
                            Passwords do not match.
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">
                            <span>Reset Password</span>
                            <div class="spinner"></div>
                        </button>
                    </div>
                </form>
                
                <div class="auth-links">
                    <p>Remember your password? <a href="{{ url('/') }}">Login here</a></p>
                </div>
            </div>
        </div>
    </div>

    <script src="{{ asset('js/reset-password.js') }}"></script>
</body>
</html>