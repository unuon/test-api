<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Budgets - BudgetTracker</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="{{ asset('css/dashboard.css') }}">
    <link rel="stylesheet" href="{{ asset('css/budget-index.css') }}">
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
                    <li><a href="/dashboard"><i class="fas fa-home"></i> Dashboard</a></li>
                    <li class="active"><a href="/budgets"><i class="fas fa-credit-card"></i> Budgets</a></li>
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
                    <h2>Budgets</h2>
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

            <!-- Budgets Content -->
            <div class="dashboard-content">
                <!-- Header with Search and Add Button -->
                <div class="budgets-header">
                    <div class="search-container">
                        <input type="text" id="budget-search" placeholder="Search budgets...">
                        <button id="search-btn"><i class="fas fa-search"></i></button>
                    </div>
                    <button class="btn-primary" id="add-budget-btn">
                        <i class="fas fa-plus"></i> Add New Budget
                    </button>
                </div>

                <!-- Budget Filters -->
                <div class="budget-filters">
                    <select id="payment-status-filter">
                        <option value="all">All Payment Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="partially_paid">Partially Paid</option>
                        <option value="unpaid">Unpaid</option>
                    </select>
                    <select id="sort-by">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                        <option value="balance_high">Highest Balance</option>
                        <option value="balance_low">Lowest Balance</option>
                    </select>
                </div>

                <!-- Budget Cards Grid -->
                <div class="budget-cards-grid" id="budget-cards-container">
                    <!-- Budget cards will be loaded here via JavaScript -->
                    <div class="loading-indicator">
                        <i class="fas fa-spinner fa-spin"></i> Loading budgets...
                    </div>
                </div>

                <!-- Pagination Controls -->
                <div class="pagination-controls" id="pagination-controls">
                    <!-- Pagination will be added here via JavaScript -->
                </div>
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
                        <label for="total_limit">Total Limit (₱)</label>
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

    <script src="{{ asset('js/budget-index.js') }}"></script>
</body>
</html>