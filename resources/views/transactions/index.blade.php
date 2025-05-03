<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transactions - BudgetTracker</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="{{ asset('css/dashboard.css') }}">
    <link rel="stylesheet" href="{{ asset('css/transaction-index.css') }}">
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
                    <li><a href="/budgets"><i class="fas fa-credit-card"></i> Budgets</a></li>
                    <li class="active"><a href="/transactions"><i class="fas fa-exchange-alt"></i> Transactions</a></li>
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
                    <h2>Transactions</h2>
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

            <!-- Transactions Content -->
            <div class="dashboard-content">
                <!-- Header with Search and Filters -->
                <div class="transactions-header">
                    <div class="search-container">
                        <input type="text" id="transaction-search" placeholder="Search transactions...">
                        <button id="search-btn"><i class="fas fa-search"></i></button>
                    </div>
                </div>

                <!-- Transaction Filters -->
                <div class="transaction-filters">
                    <select id="budget-filter">
                        <option value="all">All Budgets</option>
                        <!-- Budgets will be loaded here via JavaScript -->
                    </select>

                    <select id="type-filter">
                        <option value="all">All Types</option>
                        <option value="expense">Expenses</option>
                        <option value="payment">Payments</option>
                    </select>

                    <select id="date-filter">
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="custom">Custom Range</option>
                    </select>

                    <div id="date-range-container" class="hidden">
                        <input type="date" id="date-from">
                        <span>to</span>
                        <input type="date" id="date-to">
                        <button id="apply-date-filter" class="btn-secondary">Apply</button>
                    </div>
                </div>

                <!-- Transaction Summary -->
                <div class="transaction-summary">
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <div class="summary-info">
                            <h3>Total Transactions</h3>
                            <p id="total-transactions-count">0</p>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-arrow-down"></i>
                        </div>
                        <div class="summary-info">
                            <h3>Total Expenses</h3>
                            <p id="total-expenses">₱0.00</p>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-arrow-up"></i>
                        </div>
                        <div class="summary-info">
                            <h3>Total Payments</h3>
                            <p id="total-payments">₱0.00</p>
                        </div>
                    </div>
                </div>

                <!-- Loader -->
                <div id="loader" class="loader-container">
                    <div class="loader"></div>
                    <p>Loading transactions...</p>
                </div>

                <!-- Transactions Table -->
                <div class="transactions-container">
                    <table class="transactions-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Budget</th>
                                <th>Amount</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody id="transactions-list">
                            <!-- Transactions will be loaded here via JavaScript -->
                        </tbody>
                    </table>
                </div>

                <!-- Empty state -->
                <div id="empty-state" class="empty-state hidden">
                    <i class="fas fa-receipt"></i>
                    <h3>No Transactions Found</h3>
                    <p>No transactions match your current filters.</p>
                </div>

                <!-- Pagination Controls -->
                <div class="pagination-controls" id="pagination-controls">
                    <!-- Pagination will be added here via JavaScript -->
                </div>
            </div>
        </main>
    </div>

    <script src="{{ asset('js/transaction-index.js') }}"></script>
</body>
</html>