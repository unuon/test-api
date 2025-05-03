<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Budget Tracker Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="{{ asset('css/dashboard.css') }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <h2>BudgetTracker</h2>
            </div>
            <nav class="sidebar-nav">
                <ul>
                    <li class="active"><a href="#"><i class="fas fa-home"></i> Dashboard</a></li>
                    <li><a href="/budgets"><i class="fas fa-credit-card"></i> Budgets</a></li>
                    <li><a href="/transactions"><i class="fas fa-exchange-alt"></i> Transactions</a></li>
                    <li><a href="/reports"><i class="fas fa-chart-line"></i> Reports</a></li>
                </ul>
            </nav>
            <div class="sidebar-footer">
                <a href="#" id="logout-link"><i class="fas fa-sign-out-alt"></i> Logout</a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Top Navigation -->
            <nav class="top-nav">
                <div class="nav-left">
                    <button id="sidebar-toggle" class="menu-toggle">
                        <i class="fas fa-bars"></i>
                    </button>
                    <h2>Dashboard</h2>
                </div>
                <div class="nav-right">
                    <button id="theme-toggle" class="theme-toggle">
                        <i class="fas fa-moon"></i>
                    </button>
                    <div class="user-profile">
                        <span id="username">Welcome, {{ Auth::user()->name }}</span>
                    </div>
                </div>
            </nav>

            <!-- Dashboard Content -->
            <div class="dashboard-content">
                <!-- Summary Cards Row -->
                <section class="summary-cards">
                    <div class="card summary-card">
                        <div class="card-icon blue">
                            <i class="fas fa-credit-card"></i>
                        </div>
                        <div class="card-info">
                            <h3>Total Budgets</h3>
                            <p class="card-value" id="total-budgets">Loading...</p>
                        </div>
                    </div>
                    <div class="card summary-card">
                        <div class="card-icon green">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="card-info">
                            <h3>Available Credit</h3>
                            <p class="card-value" id="available-credit">Loading...</p>
                        </div>
                    </div>
                    <div class="card summary-card">
                        <div class="card-icon orange">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <div class="card-info">
                            <h3>Pending Payments</h3>
                            <p class="card-value" id="pending-payments">Loading...</p>
                        </div>
                    </div>
                    <div class="card summary-card">
                        <div class="card-icon purple">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="card-info">
                            <h3>Active Sub-Users</h3>
                            <p class="card-value" id="active-subusers">Loading...</p>
                        </div>
                    </div>
                </section>

                <!-- Budget Cards Section -->
                <section class="budget-cards-section">
                    <div class="header-with-actions">
                        <h1>My Budgets</h1>
                        <div class="button-group">
                            <a href="/budgets" class="btn btn-secondary">View All</a>
                            <button class="btn btn-primary" id="add-budget-btn">
                                <i class="fas fa-plus"></i> Add New Budget
                            </button>
                        </div>
                    </div>
                    <div class="budget-cards" id="budget-cards-container">
                        <!-- Budget cards will be loaded here via JavaScript -->
                        <div class="loading-indicator">
                            <i class="fas fa-spinner fa-spin"></i> Loading budgets...
                        </div>
                    </div>
                </section>

                <!-- Recent Transactions Section -->
                <section class="recent-transactions-section">
                    <div class="section-header">
                        <h2>Recent Transactions</h2>
                        <button class="btn-secondary" id="view-all-transactions">
                            View All
                        </button>
                    </div>
                    <div class="card">
                        <div class="transaction-list" id="recent-transactions">
                            <!-- Transactions will be loaded here via JavaScript -->
                            <div class="loading-indicator">
                                <i class="fas fa-spinner fa-spin"></i> Loading transactions...
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    </div>

    <!-- Add Budget Modal -->
    <div class="modal" id="add-budget-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add New Budget</h2>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <form id="add-budget-form">
                    <div class="form-group">
                        <label for="budget_name">Budget Name</label>
                        <input type="text" id="budget_name" name="budget_name" required>
                    </div>
                    <div class="form-group">
                        <label for="payment_due_date">Payment Due Date</label>
                        <input type="date" id="payment_due_date" name="payment_due_date">
                    </div>
                    <div class="form-group">
                        <label for="billing_cycle_start">Billing Cycle Start</label>
                        <input type="date" id="billing_cycle_start" name="billing_cycle_start">
                    </div>
                    <div class="form-group">
                        <label for="billing_cycle_end">Billing Cycle End</label>
                        <input type="date" id="billing_cycle_end" name="billing_cycle_end">
                    </div>
                    <div class="form-group">
                        <label for="total_limit">Total Limit</label>
                        <input type="number" id="total_limit" name="total_limit" min="0" step="0.01">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Create Budget</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="{{ asset('js/dashboard.js') }}"></script>
</body>
</html>