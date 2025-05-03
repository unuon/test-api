<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Budget Tracker</title>
    <link rel="stylesheet" href="{{ asset('css/login.css') }}">
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
                <h1>Login</h1>
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
                
                <div id="registrationSuccessAlert" class="alert alert-success" style="display: none;"></div>
                
                <form action="{{ url('/api/login') }}" method="POST" id="loginForm">
                    @csrf
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
                            Please enter your password.
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">
                            <span>Sign In</span>
                            <div class="spinner"></div>
                        </button>
                    </div>
                </form>
                
                <div class="auth-links">
                    <p>Don't have an account? <a href="{{ url('/register') }}">Register here</a></p>
                    <p>Forgot your password? <a href="{{ url('/forgot-password') }}">Reset it here</a></p>
                </div>
            </div>
        </div>
    </div>

    <script src="{{ asset('js/login.js') }}"></script>
</body>
</html>