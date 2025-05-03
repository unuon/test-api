<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - Budget Tracker</title>
    <link rel="stylesheet" href="{{ asset('css/register.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="brand">
                <h1>Budget<span>Tracker</span></h1>
            </div>
            <button class="theme-toggle" id="themeToggle">
                <i class="fas fa-moon"></i>
            </button>
        </div>
    </nav>

    <div class="auth-container">
        <div class="auth-card">
            <div class="card-header">
                <h1>Create Account</h1>
            </div>
            
            <div class="card-body">
                @if(session('error'))
                <div class="alert alert-danger">
                    {{ session('error') }}
                </div>
                @endif
                
                <form action="{{ url('/api/register') }}" method="POST" id="registerForm">
                    @csrf
                    <div class="form-group">
                        <label for="name">Full Name</label>
                        <input type="text" id="name" name="name" class="form-control" placeholder="John Doe" required>
                        <div class="invalid-feedback">
                            Please enter your name.
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" name="email" class="form-control" placeholder="your@email.com" required>
                        <div class="invalid-feedback">
                            Please enter a valid email address.
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
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
                            <span>Create Account</span>
                            <div class="spinner"></div>
                        </button>
                    </div>
                </form>
                
                <div class="auth-links">
                    <p>Already have an account? <a href="{{ url('/') }}">Login here</a></p>
                </div>
            </div>
        </div>
    </div>

    <script src="{{ asset('js/register.js') }}"></script>
</body>
</html>