<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Budget Details</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="{{ asset('css/dashboard.css') }}">
    <link rel="stylesheet" href="{{ asset('css/budget-show.css') }}">
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
                    <h2>Budget Details</h2>
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
                <div class="budget-detail-container">
                    <!-- Budget Header -->
                    <div class="budget-header">
                        <h1 id="budget-name">Loading...</h1>
                        <div class="status-wrapper">
                            <span class="payment-status" id="payment-status">...</span>
                            <button class="btn-primary" id="edit-budget-btn">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </div>
                    
                    <!-- Budget Summary Card -->
                    <div class="budget-summary card">
                        <div class="budget-detail-row">
                            <div class="detail-item">
                                <span class="label">Total Limit</span>
                                <span class="value" id="total-limit">₱0.00</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">Current Balance</span>
                                <span class="value" id="current-balance">₱0.00</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">Available Credit</span>
                                <span class="value" id="available-credit">₱0.00</span>
                            </div>
                        </div>
                        
                        <div class="budget-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" id="budget-progress" style="width: 0%"></div>
                            </div>
                            <div class="progress-labels">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>
                        
                        <div class="budget-detail-row">
                            <div class="detail-item">
                                <span class="label">Payment Due Date</span>
                                <span class="value" id="payment-due-date">-</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">Billing Cycle</span>
                                <span class="value" id="billing-cycle">-</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tabs Navigation -->
                    <div class="tabs-container">
                        <div class="tabs">
                            <button class="tab-btn active" data-tab="transactions">Transactions</button>
                            <button class="tab-btn" data-tab="sub-users">Sub-Users</button>
                        </div>
                        
                        <!-- Transactions Tab -->
                        <div class="tab-content active" id="transactions-tab">
                            <div class="section-header">
                                <h2>Transactions</h2>
                                <button class="btn-primary" id="add-transaction-btn">
                                    <i class="fas fa-plus"></i> Add Transaction
                                </button>
                            </div>
                            
                            <div class="transactions-list" id="transactions-list">
                                <div class="loading">Loading transactions...</div>
                            </div>
                        </div>
                        
                        <!-- Sub-Users Tab -->
                        <div class="tab-content" id="sub-users-tab">
                            <div class="section-header">
                                <h2>Sub-Users</h2>
                                <button class="btn-primary" id="add-sub-user-btn">
                                    <i class="fas fa-plus"></i> Add Sub-User
                                </button>
                            </div>
                            
                            <div class="sub-users-list" id="sub-users-list">
                                <div class="loading">Loading sub-users...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Add Transaction Modal -->
    <div id="add-transaction-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Transaction</h2>
                <span class="close-btn">&times;</span>
            </div>
            <div class="modal-body">
                <form id="add-transaction-form">
                    <div class="form-group">
                        <label for="description">Description</label>
                        <input type="text" id="description" name="description" required>
                    </div>
                    <div class="form-group">
                        <label for="amount">Amount (₱)</label>
                        <input type="number" id="amount" name="amount" step="0.01" required>
                        <div class="amount-type">
                            <label>
                                <input type="radio" name="amount_type" value="expense" checked> Expense
                            </label>
                            <label>
                                <input type="radio" name="amount_type" value="payment"> Payment
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="transaction_date">Date</label>
                        <input type="date" id="transaction_date" name="transaction_date" required>
                    </div>
                    <div class="form-group">
                        <label for="sub_user_id">Assign to Sub-User (Optional)</label>
                        <select id="sub_user_id" name="sub_user_id">
                            <option value="">None (Main Budget)</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- Add Sub-User Modal -->
    <div id="add-sub-user-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Sub-User</h2>
                <span class="close-btn">&times;</span>
            </div>
            <div class="modal-body">
                <form id="add-sub-user-form">
                    <div class="form-group">
                        <label for="sub_user_name">Name</label>
                        <input type="text" id="sub_user_name" name="sub_user_name" required>
                    </div>
                    <div class="form-group">
                        <label for="credit_limit">Credit Limit (₱)</label>
                        <input type="number" id="credit_limit" name="credit_limit" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="start_date">Start Date</label>
                        <input type="date" id="start_date" name="start_date" required>
                    </div>
                    <div class="form-group">
                        <label for="end_date">End Date (Optional)</label>
                        <input type="date" id="end_date" name="end_date">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- Edit Budget Modal -->
    <div id="edit-budget-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Budget</h2>
                <span class="close-btn">&times;</span>
            </div>
            <div class="modal-body">
                <form id="edit-budget-form">
                    <div class="form-group">
                        <label for="edit_budget_name">Budget Name</label>
                        <input type="text" id="edit_budget_name" name="budget_name" required>
                    </div>
                    <div class="form-group">
                        <label for="edit_total_limit">Total Limit (₱)</label>
                        <input type="number" id="edit_total_limit" name="total_limit" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="edit_payment_due_date">Payment Due Date</label>
                        <input type="date" id="edit_payment_due_date" name="payment_due_date">
                    </div>
                    <div class="form-group">
                        <label for="edit_billing_cycle_start">Billing Cycle Start</label>
                        <input type="date" id="edit_billing_cycle_start" name="billing_cycle_start">
                    </div>
                    <div class="form-group">
                        <label for="edit_billing_cycle_end">Billing Cycle End</label>
                        <input type="date" id="edit_billing_cycle_end" name="billing_cycle_end">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Edit Sub-User Modal -->
    <div id="edit-sub-user-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Sub-User</h2>
                <span class="close-btn">&times;</span>
            </div>
            <div class="modal-body">
                <form id="edit-sub-user-form">
                    <input type="hidden" id="edit_sub_user_id">
                    <div class="form-group">
                        <label for="edit_sub_user_name">Name</label>
                        <input type="text" id="edit_sub_user_name" name="sub_user_name" required>
                    </div>
                    <div class="form-group">
                        <label for="edit_credit_limit">Credit Limit (₱)</label>
                        <input type="number" id="edit_credit_limit" name="credit_limit" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="edit_start_date">Start Date</label>
                        <input type="date" id="edit_start_date" name="start_date" required>
                    </div>
                    <div class="form-group">
                        <label for="edit_end_date">End Date (Optional)</label>
                        <input type="date" id="edit_end_date" name="end_date">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Delete Sub-User Confirmation Modal -->
    <div id="delete-sub-user-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Delete Sub-User</h2>
                <span class="close-btn">&times;</span>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete "<span id="delete-sub-user-name"></span>"?</p>
                <p class="warning-text">This action cannot be undone. All transactions associated with this sub-user will also be deleted.</p>
                <input type="hidden" id="delete_sub_user_id">
                <div class="form-actions">
                    <button type="button" class="cancel-btn">Cancel</button>
                    <button type="button" id="confirm-delete-sub-user" class="btn-danger">Delete</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Transaction Modal -->
    <div id="edit-transaction-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Transaction</h2>
                <span class="close-btn">&times;</span>
            </div>
            <div class="modal-body">
                <form id="edit-transaction-form">
                    <input type="hidden" id="edit_transaction_id">
                    <div class="form-group">
                        <label for="edit_description">Description</label>
                        <input type="text" id="edit_description" name="description" required>
                    </div>
                    <div class="form-group">
                        <label for="edit_amount">Amount (₱)</label>
                        <input type="number" id="edit_amount" name="amount" step="0.01" required>
                        <div class="amount-type">
                            <label>
                                <input type="radio" name="edit_amount_type" value="expense" checked> Expense
                            </label>
                            <label>
                                <input type="radio" name="edit_amount_type" value="payment"> Payment
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit_transaction_date">Date</label>
                        <input type="date" id="edit_transaction_date" name="transaction_date" required>
                    </div>
                    <div class="form-group">
                        <label for="edit_sub_user_id">Assign to Sub-User (Optional)</label>
                        <select id="edit_sub_users_id" name="sub_user_id">
                            <option value="">None (Main Budget)</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Delete Transaction Confirmation Modal -->
    <div id="delete-transaction-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Delete Transaction</h2>
                <span class="close-btn">&times;</span>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this transaction?</p>
                <p class="transaction-summary" id="delete-transaction-summary"></p>
                <p class="warning-text">This action cannot be undone.</p>
                <input type="hidden" id="delete_transaction_id">
                <div class="form-actions">
                    <button type="button" class="cancel-btn">Cancel</button>
                    <button type="button" id="confirm-delete-transaction" class="btn-danger">Delete</button>
                </div>
            </div>
        </div>
    </div>

    <script src="{{ asset('js/budget-show.js') }}"></script>
</body>
</html>