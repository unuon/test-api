<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Email Address</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #444;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #8DB9CB, #A2CAD7);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            letter-spacing: 1px;
        }
        .content {
            padding: 35px;
            background-color: white;
        }
        .greeting {
            font-size: 22px;
            color: #333;
            margin-top: 0;
            margin-bottom: 25px;
        }
        .message {
            margin-bottom: 30px;
            font-size: 16px;
            color: #555;
            line-height: 1.7;
        }
        .button-container {
            text-align: center;
            margin: 35px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(to right, #8DB9CB, #A2CAD7);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s;
            box-shadow: 0 4px 12px rgba(162, 202, 215, 0.4);
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 15px;
        }
        .footer {
            text-align: center;
            background-color: #f7f7f7;
            padding: 20px;
            font-size: 12px;
            color: #999;
        }
        .logo-text {
            font-weight: 700;
            letter-spacing: 1px;
        }
        .logo-text span {
            color: #8DB9CB;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Budget<span>Tracker</span></h1>
        </div>
        <div class="content">
            <h2 class="greeting">Hello {{ $user->name }},</h2>
            
            <p class="message">Thank you for registering with BudgetTracker. We're excited to have you on board! To complete your registration and start managing your finances, please verify your email address.</p>
            
            <div class="button-container">
                <a href="{{ $verificationUrl }}" class="button">Verify My Email</a>
            </div>
            
            <p class="message">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
            
            <div class="signature">
                <p>Regards,<br><strong>The BudgetTracker Team</strong></p>
            </div>
        </div>
        
        <div class="footer">
            <p>&copy; {{ date('Y') }} BudgetTracker. All rights reserved.</p>
        </div>
    </div>
</body>
</html>