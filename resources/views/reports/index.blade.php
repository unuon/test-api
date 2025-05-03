<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reports - BudgetTracker</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="{{ asset('css/dashboard.css') }}">
    <link rel="stylesheet" href="{{ asset('css/reports-index.css') }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
                    <li><a href="/transactions"><i class="fas fa-exchange-alt"></i> Transactions</a></li>
                    <li class="active"><a href="/reports"><i class="fas fa-chart-line"></i> Reports</a></li>
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
                    <h2>Reports</h2>
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

            <!-- Reports Content -->
            <div class="dashboard-content">
                <!-- Filter Controls -->
                <div class="report-filters">
                    <div class="filter-group">
                        <label for="date-range">Date Range:</label>
                        <select id="date-range">
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="last_3_months">Last 3 Months</option>
                            <option value="last_6_months">Last 6 Months</option>
                            <option value="this_year">This Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    
                    <div class="filter-group" id="custom-date-range" style="display: none;">
                        <label for="start-date">From:</label>
                        <input type="date" id="start-date">
                        
                        <label for="end-date">To:</label>
                        <input type="date" id="end-date">
                        
                        <button id="apply-date-filter" class="btn-primary">Apply</button>
                    </div>
                    
                    <div class="filter-group">
                        <label for="budget-filter">Budget:</label>
                        <select id="budget-filter">
                            <option value="all">All Budgets</option>
                            <!-- Budgets loaded via JS -->
                        </select>
                    </div>
                </div>

                <!-- Loader -->
                <div id="loader" class="loader-container">
                    <div class="loader"></div>
                    <p>Loading report data...</p>
                </div>
                
                <!-- Summary Cards -->
                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="summary-info">
                            <h3>Total Expenses</h3>
                            <p id="total-expenses">₱0.00</p>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-wallet"></i>
                        </div>
                        <div class="summary-info">
                            <h3>Total Income</h3>
                            <p id="total-income">₱0.00</p>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-balance-scale"></i>
                        </div>
                        <div class="summary-info">
                            <h3>Net Balance</h3>
                            <p id="net-balance">₱0.00</p>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <div class="summary-info">
                            <h3>Transaction Count</h3>
                            <p id="transaction-count">0</p>
                        </div>
                    </div>
                </div>
                
                <!-- Main Charts -->
                <div class="charts-container">
                    <!-- Expenses vs Income Chart -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>Expenses vs Income</h3>
                            <div class="chart-actions">
                                <button class="btn-icon" id="download-income-expense">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                        <div class="chart-body">
                            <canvas id="income-expense-chart"></canvas>
                        </div>
                    </div>
                    
                    <!-- Expense Categories Chart -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>Expenses by Budget</h3>
                            <div class="chart-actions">
                                <button class="btn-icon" id="download-expense-category">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                        <div class="chart-body">
                            <canvas id="expense-category-chart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Additional Charts -->
                <div class="charts-container">
                    <!-- Monthly Trend Chart -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>Monthly Trends</h3>
                            <div class="chart-actions">
                                <button class="btn-icon" id="download-monthly-trend">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                        <div class="chart-body">
                            <canvas id="monthly-trend-chart"></canvas>
                        </div>
                    </div>
                    
                    <!-- Sub-User Spending Chart -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>Top Expenses</h3>
                            <div class="chart-actions">
                                <button class="btn-icon" id="download-top-expenses">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                        <div class="chart-body">
                            <canvas id="top-expenses-chart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Empty state -->
                <div id="empty-state" class="empty-state hidden">
                    <i class="fas fa-chart-bar"></i>
                    <h3>No Data Available</h3>
                    <p>There is no transaction data available for the selected filters.</p>
                </div>
            </div>
        </main>
    </div>

    <script src="{{ asset('js/reports-index.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
</body>
</html>