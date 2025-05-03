document.addEventListener('DOMContentLoaded', function() {
    // Store authenticated state globally
    let isAuthenticated = false;
    let authToken = localStorage.getItem('token');
    
    // Validate token once at the beginning
    async function validateAuth() {
        if (!authToken) {
            redirectToLogin();
            return false;
        }
        
        // Send token to establish session synchronously
        try {
            await fetch('/set-session-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({ token: authToken })
            });
            
            isAuthenticated = true;
            return true;
        } catch (error) {
            console.error('Auth validation error:', error);
            redirectToLogin();
            return false;
        }
    }
    
    function redirectToLogin() {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
    
    // Initialize dashboard with error handling
    async function initDashboard() {
        // Skip other initialization if auth fails
        if (!await validateAuth()) return;
        
        // Setup UI components immediately
        setupThemeToggle();
        setupSidebar();
        setupModal();
        setupEventListeners();
        
        // Show loading indicators
        document.getElementById('total-budgets').textContent = 'Loading...';
        document.getElementById('available-credit').textContent = 'Loading...';
        document.getElementById('pending-payments').textContent = 'Loading...';
        document.getElementById('active-subusers').textContent = 'Loading...';
        document.getElementById('recent-transactions').innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i> Loading transactions...
            </div>
        `;
        
        try {
            // First, get the budget IDs in a fast, separate request
            const budgetIdsResponse = await fetch('/api/budgets?fields=budget_id', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            }).catch(() => ({ ok: false }));
            
            // Extract budget IDs if available
            let budgetIds = [];
            if (budgetIdsResponse && budgetIdsResponse.ok) {
                try {
                    const data = await budgetIdsResponse.json();
                    budgetIds = (data.data || []).map(b => b.budget_id).filter(id => id);
                } catch (e) {
                    console.error('Error parsing budget IDs:', e);
                }
            }
            
            // Create transaction request promises based on budget IDs
            const transactionPromises = budgetIds.map(budgetId => 
                fetch(`/api/budgets/${budgetId}/transactions`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                })
            );
            
            // Start ALL API requests simultaneously using a Promise.all
            // Include transaction requests alongside budget and sub-user requests
            const [budgetsResponse, subUsersResponse, ...transactionResponses] = await Promise.all([
                // Get full budget details
                fetch('/api/budgets', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }),
                // Get sub-users count
                fetch('/api/sub-users/count', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }),
                // Include all transaction requests
                ...transactionPromises
            ]);
            
            // Process budget response
            let budgets = [];
            if (budgetsResponse.ok) {
                const data = await budgetsResponse.json();
                budgets = data.data || [];
            }
            
            // Process sub-users response
            let subUsersCount = 0;
            if (subUsersResponse.ok) {
                const data = await subUsersResponse.json();
                subUsersCount = data.data.count || 0;
            }
            
            // Process transaction responses
            const transactionDataPromises = transactionResponses.map((response, index) => {
                if (!response.ok) return [];
                return response.json()
                    .then(data => {
                        // Find corresponding budget for this transaction
                        const budgetId = budgetIds[index];
                        const budget = budgets.find(b => b.budget_id === budgetId);
                        const budgetName = budget ? budget.budget_name : 'Unknown Budget';
                        
                        // Add budget_name to each transaction
                        return (data.data || []).map(transaction => ({
                            ...transaction,
                            budget_name: budgetName
                        }));
                    })
                    .catch(() => []);
            });
            
            // Process transaction data while updating UI
            let allTransactions = [];
            
            // Update the UI with budget data immediately
            if (!budgets || budgets.length === 0) {
                document.getElementById('total-budgets').textContent = '0';
                document.getElementById('available-credit').textContent = '₱0.00';
                document.getElementById('pending-payments').textContent = '0';
                
                document.getElementById('budget-cards-container').innerHTML = `
                    <div class="empty-state">
                        <p>You don't have any budgets yet. Create one to get started!</p>
                    </div>
                `;
            } else {
                document.getElementById('total-budgets').textContent = budgets.length;
                
                // Calculate available credit
                const totalLimit = budgets.reduce((sum, budget) => sum + parseFloat(budget.total_limit || 0), 0);
                const currentBalance = budgets.reduce((sum, budget) => sum + parseFloat(budget.current_balance || 0), 0);
                const availableCredit = totalLimit - currentBalance;
                document.getElementById('available-credit').textContent = `₱${availableCredit.toFixed(2)}`;
                
                // Count pending payments
                const pendingPayments = budgets.filter(budget => 
                    budget.payment_status === 'unpaid' || budget.payment_status === 'partially_paid'
                ).length;
                document.getElementById('pending-payments').textContent = pendingPayments;
                
                // Render budget cards
                renderBudgetCards(budgets);
            }
            
            // Update sub-users count immediately
            document.getElementById('active-subusers').textContent = subUsersCount;
            
            // Process transaction data
            allTransactions = (await Promise.all(transactionDataPromises)).flat();
            
            // Sort transactions by date and limit to 5
            allTransactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
            allTransactions = allTransactions.slice(0, 5);
            
            // Update transactions
            if (!allTransactions || allTransactions.length === 0) {
                document.getElementById('recent-transactions').innerHTML = `
                    <div class="empty-state">
                        <p>No transactions found. Add a transaction to get started!</p>
                    </div>
                `;
            } else {
                renderTransactions(allTransactions);
            }
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            
            // Set default values for any elements that might not have been updated
            document.getElementById('total-budgets').textContent = '0';
            document.getElementById('available-credit').textContent = '₱0.00';
            document.getElementById('pending-payments').textContent = '0';
            document.getElementById('active-subusers').textContent = '0';
            
            document.getElementById('budget-cards-container').innerHTML = `
                <div class="alert alert-danger">
                    <p>Error loading dashboard data. Please refresh the page or try again later.</p>
                </div>
            `;
            
            document.getElementById('recent-transactions').innerHTML = `
                <div class="empty-state">
                    <p>Error loading transactions. Please try again later.</p>
                </div>
            `;
        }
    }
    
    // Setup UI functions
    function setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;
        
        const themeIcon = themeToggle.querySelector('i');
        const body = document.body;
        
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            body.setAttribute('data-theme', 'dark');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        }
        
        themeToggle.addEventListener('click', function() {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
            }
        });
    }
    
    function setupSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            });
            
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    }
    
    function setupModal() {
        const addBudgetBtn = document.getElementById('add-budget-btn');
        const addBudgetModal = document.getElementById('add-budget-modal');
        const closeBtn = document.querySelector('.close-btn');
        const cancelBtn = document.querySelector('.cancel-btn');
        
        if (addBudgetBtn && addBudgetModal) {
            addBudgetBtn.addEventListener('click', function() {
                addBudgetModal.style.display = 'flex';
            });
            
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    addBudgetModal.style.display = 'none';
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    addBudgetModal.style.display = 'none';
                });
            }
            
            addBudgetModal.addEventListener('click', function(event) {
                if (event.target === addBudgetModal) {
                    addBudgetModal.style.display = 'none';
                }
            });
        }
    }
    
    function setupEventListeners() {
        // Add budget form
        const addBudgetForm = document.getElementById('add-budget-form');
        if (addBudgetForm) {
            // Add validation for total_limit input
            const totalLimitInput = document.getElementById('total_limit');
            const submitBtn = addBudgetForm.querySelector('button[type="submit"]'); 
            const budgetNameInput = document.getElementById('budget_name');
            
            // Add validation function for the form
            function validateBudgetForm() {
                let isValid = true;
                
                // Validate budget name
                if (!budgetNameInput.value.trim()) {
                    budgetNameInput.classList.add('error');
                    isValid = false;
                } else {
                    budgetNameInput.classList.remove('error');
                }
                
                // Validate total limit - ensure it's greater than 0
                const totalLimit = parseFloat(totalLimitInput.value);
                if (isNaN(totalLimit) || totalLimit <= 0) {
                    totalLimitInput.classList.add('error');
                    isValid = false;
                } else {
                    totalLimitInput.classList.remove('error');
                }
                
                // Update submit button state
                if (submitBtn) {
                    submitBtn.disabled = !isValid;
                }
                
                return isValid;
            }
            
            // Add event listeners for input validation
            if (totalLimitInput) {
                totalLimitInput.addEventListener('input', validateBudgetForm);
            }
            if (budgetNameInput) {
                budgetNameInput.addEventListener('input', validateBudgetForm);
            }
            
            // Initial validation
            validateBudgetForm();
            
            // Update the submit handler to include validation
            addBudgetForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                
                // Validate form before submission
                if (!validateBudgetForm()) {
                    showNotification('Please correct the errors in the form.', 'error');
                    return;
                }
                
                // Get form data
                const formData = {
                    budget_name: budgetNameInput.value.trim(),
                    payment_due_date: document.getElementById('payment_due_date').value || null,
                    billing_cycle_start: document.getElementById('billing_cycle_start').value || null,
                    billing_cycle_end: document.getElementById('billing_cycle_end').value || null,
                    total_limit: parseFloat(totalLimitInput.value)
                };
                
                // Create a new budget
                await createBudget(formData);
            });
        }
        
        // Logout functionality
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('token');
                window.location.href = '/';
            });
        }
        
        // View all transactions button
        const viewAllTransactionsBtn = document.getElementById('view-all-transactions');
        if (viewAllTransactionsBtn) {
            viewAllTransactionsBtn.addEventListener('click', function() {
                window.location.href = '/transactions';
            });
        }
        
        // View all budgets button (this could be added next to "My Budgets" heading)
        const viewAllBudgetsBtn = document.createElement('button');
        viewAllBudgetsBtn.className = 'btn-secondary';
        viewAllBudgetsBtn.innerHTML = 'View All';
        viewAllBudgetsBtn.addEventListener('click', function() {
            window.location.href = '/budgets';
        });
        
        // Find the "My Budgets" section header
        const budgetSectionHeader = document.querySelector('.budget-cards-section .section-header');
        if (budgetSectionHeader) {
            // Insert the View All button after the h2 but before the Add New Budget button
            const addBudgetBtn = budgetSectionHeader.querySelector('#add-budget-btn');
            if (addBudgetBtn) {
                budgetSectionHeader.insertBefore(viewAllBudgetsBtn, addBudgetBtn);
            }
        }
    }
    
    // API Functions - No longer checking auth in each function
    async function fetchBudgets() {
        try {
            const response = await fetch('/api/budgets', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    redirectToLogin();
                    return [];
                }
                throw new Error('Failed to fetch budgets');
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching budgets:', error);
            return [];
        }
    }
    
    async function createBudget(budgetData) {
        // Create a loader overlay
        const loader = document.createElement('div');
        loader.className = 'loader-overlay';
        loader.innerHTML = `
            <div class="loader-container">
                <div class="loader-spinner"></div>
                <p>Creating Budget...</p>
            </div>
        `;
        document.body.appendChild(loader);
        
        try {
            // Create form body WITHOUT user_id
            const dataToSend = {
                ...budgetData,
                // Make sure numbers are actually sent as numbers
                total_limit: parseFloat(budgetData.total_limit),
                current_balance: 0, // Start with zero balance
                payment_status: 'paid' // Set default status to paid instead of unpaid
            };
            
            const response = await fetch('/api/budgets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });
            
            // Check if we got non-JSON response
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                throw new Error('Server did not return JSON. Status: ' + response.status);
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }
                
                let errorMessage = 'Failed to create budget';
                if (data.message) {
                    errorMessage += ': ' + data.message;
                }
                if (data.errors) {
                    errorMessage += '\n' + Object.values(data.errors).flat().join('\n');
                }
                
                throw new Error(errorMessage);
            }
            
            // Close modal and reset form
            document.getElementById('add-budget-modal').style.display = 'none';
            document.getElementById('add-budget-form').reset();
            
            // Reload budgets
            const budgets = await fetchBudgets();
            renderBudgetCards(budgets);
            await updateSummaryCards(budgets);
            
            // Reload transactions
            const transactions = await fetchTransactions(budgets);
            renderTransactions(transactions);
            
            // Show success notification
            showNotification('Budget created successfully!', 'success');
        } catch (error) {
            console.error('Error creating budget:', error);
            showNotification(error.message || 'Failed to create budget. Please try again.', 'error');
        } finally {
            // Remove loader
            document.body.removeChild(loader);
        }
    }
    
    // Add this custom notification function
    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        
        // Set icon based on type
        const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Add close button functionality
        notification.querySelector('.notification-close').addEventListener('click', function() {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
    
    // Modified function to handle transactions with or without budget data
    async function fetchTransactions(budgets = []) {
        if (!budgets || budgets.length === 0) return [];
        
        try {
            // Create fetch promises for all budgets in parallel
            const fetchPromises = budgets.map(budget => 
                fetch(`/api/budgets/${budget.budget_id}/transactions`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                })
                .then(response => {
                    if (!response.ok) return [];
                    return response.json()
                        .then(data => (data.data || []).map(transaction => ({
                            ...transaction,
                            budget_name: budget.budget_name
                        })));
                })
                .catch(() => [])
            );
            
            // Wait for all promises to resolve
            const results = await Promise.all(fetchPromises);
            let allTransactions = results.flat();
            
            // Sort by date (newest first)
            allTransactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
            
            // Return only 5 most recent
            return allTransactions.slice(0, 5);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }
    
    /**
     * Updates the summary cards at the top of the dashboard with budget data
     * @param {Array} budgets - Array of budget objects from the API
     */
    async function updateSummaryCards(budgets) {
        // Get elements
        const totalBudgetsEl = document.getElementById('total-budgets');
        const availableCreditEl = document.getElementById('available-credit');
        const pendingPaymentsEl = document.getElementById('pending-payments');
        const activeSubusersEl = document.getElementById('active-subusers');
        
        if (!budgets || budgets.length === 0) {
            // Set default values if no budgets
            totalBudgetsEl.textContent = '0';
            availableCreditEl.textContent = 'PHP0.00';
            pendingPaymentsEl.textContent = '0';
            activeSubusersEl.textContent = '0';
            return;
        }
        
        // Update total budgets
        totalBudgetsEl.textContent = budgets.length;
        
        // Calculate available credit (total_limit - current_balance)
        const totalLimit = budgets.reduce((sum, budget) => sum + parseFloat(budget.total_limit || 0), 0);
        const currentBalance = budgets.reduce((sum, budget) => sum + parseFloat(budget.current_balance || 0), 0);
        const availableCredit = totalLimit - currentBalance;
        availableCreditEl.textContent = `₱${availableCredit.toFixed(2)}`;
        
        // Count pending payments (budgets with unpaid status)
        const pendingPayments = budgets.filter(budget => 
            budget.payment_status === 'unpaid' || budget.payment_status === 'partially_paid'
        ).length;
        
        pendingPaymentsEl.textContent = pendingPayments;
        
        // Fetch active sub-users count
        try {
            const response = await fetch('/api/sub-users/count', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                activeSubusersEl.textContent = data.data.count;
            } else {
                activeSubusersEl.textContent = '0';
            }
        } catch (error) {
            console.error('Error fetching sub-user count:', error);
            activeSubusersEl.textContent = '0';
        }
    }
    
    /**
     * Renders budget cards in the UI based on budget data
     * @param {Array} budgets - Array of budget objects from the API
     */
    function renderBudgetCards(budgets) {
        const container = document.getElementById('budget-cards-container');
        
        if (!budgets || budgets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>You don't have any budgets yet. Create one to get started!</p>
                </div>
            `;
            return;
        }
        
        // Clear loading indicator
        container.innerHTML = '';
        
        // Create a card for each budget
        budgets.forEach(budget => {
            // Calculate percentage of budget used
            const totalLimit = parseFloat(budget.total_limit || 0);
            const currentBalance = parseFloat(budget.current_balance || 0);
            const percentUsed = totalLimit > 0 ? (currentBalance / totalLimit) * 100 : 0;
            
            let statusClass = 'status-unpaid';
            let statusText = 'Unpaid';

            if (budget.payment_status === 'paid') {
                statusClass = 'status-paid';
                statusText = 'Paid';
            } else if (budget.payment_status === 'partially_paid') {
                statusClass = 'status-partial';
                statusText = 'Partial';
            }
            
            // Format dates
            const dueDate = budget.payment_due_date ? new Date(budget.payment_due_date).toLocaleDateString() : 'N/A';
            
            // Create card HTML
            const cardHtml = `
                <div class="budget-card card" data-budget-id="${budget.budget_id}">
                    <div class="budget-card-header">
                        <div>
                            <h3 class="budget-name">${budget.budget_name}</h3>
                        </div>
                        <span class="payment-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="budget-details">
                        <div class="budget-balance">
                            <span>Balance: ₱${currentBalance.toFixed(2)}</span>
                            <span>Limit: ₱${totalLimit.toFixed(2)}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentUsed}%"></div>
                        </div>
                    </div>
                    <div class="budget-actions">
                        <div class="due-date">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Due: ${dueDate}</span>
                        </div>
                        <a href="/budgets/${budget.budget_id}" class="btn-secondary">
                            <i class="fas fa-eye"></i> View
                        </a>
                    </div>
                </div>
            `;
            
            // Add to container
            container.innerHTML += cardHtml;
        });
    }
    
    /**
     * Renders transaction list in the UI
     * @param {Array} transactions - Array of transaction objects
     */
    function renderTransactions(transactions) {
        const container = document.getElementById('recent-transactions');
        
        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No transactions found. Add a transaction to get started!</p>
                </div>
            `;
            return;
        }
        
        // Clear loading indicator
        container.innerHTML = '';
        
        // Create a list item for each transaction
        transactions.forEach(transaction => {
            // Format amount
            const amount = parseFloat(transaction.amount);
            const formattedAmount = '₱' + Math.abs(amount).toFixed(2);
            const amountClass = amount < 0 ? 'amount-negative' : 'amount-positive';
            
            // Format date
            const date = new Date(transaction.transaction_date).toLocaleDateString();
            
            // Create transaction HTML
            const transactionHtml = `
                <div class="transaction-item">
                    <div class="transaction-icon">
                        <i class="fas fa-${amount < 0 ? 'arrow-down' : 'arrow-up'}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-description">${transaction.description || 'Transaction'}</div>
                        <div class="transaction-meta">
                            <span>${date}</span>
                            <span>${transaction.budget_name}</span>
                        </div>
                    </div>
                    <div class="transaction-amount ${amountClass}">
                        ${amount < 0 ? '-' : '+'}${formattedAmount}
                    </div>
                </div>
            `;
            
            // Add to container
            container.innerHTML += transactionHtml;
        });
    }
    
    // Start the dashboard
    initDashboard();
});