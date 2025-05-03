document.addEventListener('DOMContentLoaded', function() {
    // Get the auth token from local storage
    const authToken = localStorage.getItem('token');
    if (!authToken) {
        window.location.href = '/';
        return;
    }
    
    // Get budget ID from URL
    const pathParts = window.location.pathname.split('/');
    const budgetId = pathParts[pathParts.length - 1];
    
    // Setup theme preference
    setupThemePreference();
    
    // Initialize the page
    initializeBudgetPage(budgetId);
});

async function initializeBudgetPage(budgetId) {
    // Setup UI components
    setupTabs();
    setupModals();
    setupSidebarToggle();
    
    // Load budget data
    await loadBudgetDetails(budgetId);
    await loadTransactions(budgetId);
    await loadSubUsers(budgetId);
    
    // Setup form submissions
    setupTransactionForm(budgetId);
    setupSubUserForm(budgetId);
    setupEditBudgetForm(budgetId);
    setupEditSubUserForm(budgetId);
    setupDeleteSubUserHandler(budgetId);
    setupEditTransactionForm(budgetId);
    setupDeleteTransactionHandler(budgetId);
    
    // Check available credit and show notification if needed
    checkAvailableCredit();
}

// UI Setup Functions
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabName = button.dataset.tab;
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

function setupModals() {
    // Modal toggle buttons
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const addSubUserBtn = document.getElementById('add-sub-user-btn');
    const editBudgetBtn = document.getElementById('edit-budget-btn');
    
    // Modals
    const addTransactionModal = document.getElementById('add-transaction-modal');
    const addSubUserModal = document.getElementById('add-sub-user-modal');
    const editBudgetModal = document.getElementById('edit-budget-modal');
    const editSubUserModal = document.getElementById('edit-sub-user-modal');
    const deleteSubUserModal = document.getElementById('delete-sub-user-modal');
    const editTransactionModal = document.getElementById('edit-transaction-modal');
    const deleteTransactionModal = document.getElementById('delete-transaction-modal');
    
    // Close buttons
    const closeButtons = document.querySelectorAll('.close-btn, .cancel-btn');
    
    // Open modals
    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', () => {
            addTransactionModal.style.display = 'flex';
            // Set default date to today
            document.getElementById('transaction_date').valueAsDate = new Date();
        });
    }
    
    if (addSubUserBtn) {
        addSubUserBtn.addEventListener('click', () => {
            addSubUserModal.style.display = 'flex';
            // Set default date to today
            document.getElementById('start_date').valueAsDate = new Date();
        });
    }
    
    if (editBudgetBtn) {
        editBudgetBtn.addEventListener('click', () => {
            editBudgetModal.style.display = 'flex';
        });
    }
    
    // Close modals when clicking close/cancel buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (addTransactionModal) addTransactionModal.style.display = 'none';
            if (addSubUserModal) addSubUserModal.style.display = 'none';
            if (editBudgetModal) editBudgetModal.style.display = 'none';
            if (editSubUserModal) editSubUserModal.style.display = 'none';
            if (deleteSubUserModal) deleteSubUserModal.style.display = 'none';
            if (editTransactionModal) editTransactionModal.style.display = 'none';
            if (deleteTransactionModal) deleteTransactionModal.style.display = 'none';
        });
    });
    
    // Close when clicking outside
    window.addEventListener('click', event => {
        if (event.target === addTransactionModal) addTransactionModal.style.display = 'none';
        if (event.target === addSubUserModal) addSubUserModal.style.display = 'none';
        if (event.target === editBudgetModal) editBudgetModal.style.display = 'none';
        if (event.target === editSubUserModal) editSubUserModal.style.display = 'none';
        if (event.target === deleteSubUserModal) deleteSubUserModal.style.display = 'none';
        if (event.target === editTransactionModal) editTransactionModal.style.display = 'none';
        if (event.target === deleteTransactionModal) deleteTransactionModal.style.display = 'none';
    });
}

// Data Loading Functions
async function loadBudgetDetails(budgetId) {
    const now = Date.now();
    
    // Use cache if it's fresh
    if (dataCache.budgetDetails && 
        dataCache.lastUpdated.budgetDetails > now - dataCache.cacheLifetime) {
        updateBudgetUI(dataCache.budgetDetails);
        return dataCache.budgetDetails;
    }
    
    try {
        const response = await fetch(`/api/budgets/${budgetId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/';
                return;
            }
            throw new Error('Failed to load budget details');
        }
        
        const data = await response.json();
        const budget = data.data.budget;
        
        // Cache the data
        dataCache.budgetDetails = budget;
        dataCache.lastUpdated.budgetDetails = now;
        
        // Update UI
        updateBudgetUI(budget);
        
        return budget;
    } catch (error) {
        console.error('Error loading budget details:', error);
        alert('Failed to load budget details. Please try again later.');
    }
}

async function loadTransactions(budgetId) {
    try {
        const response = await fetch(`/api/budgets/${budgetId}/transactions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load transactions');
        }
        
        const data = await response.json();
        const transactions = data.data;
        
        const container = document.getElementById('transactions-list');
        
        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No transactions found. Add a transaction to get started!</p>
                </div>
            `;
            return;
        }
        
        // Clear loading message
        container.innerHTML = '';
        
        // Create table
        const table = document.createElement('table');
        table.className = 'transactions-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Sub-User</th>
                    <th>Amount</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        // Add each transaction to table
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(transaction.transaction_date).toLocaleDateString();
            
            // Format amount
            const amount = parseFloat(transaction.amount);
            const isExpense = amount < 0;
            const formattedAmount = `₱${Math.abs(amount).toFixed(2)}`;
            const amountClass = isExpense ? 'amount-negative' : 'amount-positive';
            
            // Ensure we have a transaction ID - use either transaction_id or id field
            const transactionId = transaction.transaction_id || transaction.id;
            
            console.log(`Transaction ID for ${transaction.description}: ${transactionId}`);
            
            if (!transactionId) {
                console.error('Missing transaction ID for transaction:', transaction);
            }
            
            row.innerHTML = `
                <td>${date}</td>
                <td>${transaction.description || 'Transaction'}</td>
                <td>${transaction.sub_user ? transaction.sub_user.sub_user_name : 'Main Budget'}</td>
                <td class="${amountClass}">${isExpense ? '-' : '+'}${formattedAmount}</td>
                <td class="actions">
                    <button class="btn-icon edit" data-id="${transactionId}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" data-id="${transactionId}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
            
            // Add event listeners for edit and delete buttons
            const editBtn = row.querySelector('.edit');
            const deleteBtn = row.querySelector('.delete');
            
            editBtn.addEventListener('click', () => {
                // Store the ID on the transaction object if it's missing
                if (!transaction.transaction_id && transaction.id) {
                    transaction.transaction_id = transaction.id;
                }
                editTransaction(transaction);
            });
            
            deleteBtn.addEventListener('click', () => {
                // Store the ID on the transaction object if it's missing
                if (!transaction.transaction_id && transaction.id) {
                    transaction.transaction_id = transaction.id;
                }
                confirmDeleteTransaction(transaction);
            });
        });
        
        container.appendChild(table);
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactions-list').innerHTML = `
            <div class="empty-state">
                <p>Error loading transactions. Please try again later.</p>
            </div>
        `;
    }
}

// Optimized loadSubUsers function to load all sub-users at once
async function loadSubUsers(budgetId) {
    try {
        // Show loading indicator
        const container = document.getElementById('sub-users-list');
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Loading sub-users...
            </div>
        `;
        
        // Fetch all sub-users in one request
        const response = await fetch(`/api/budgets/${budgetId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load sub-users');
        }
        
        const data = await response.json();
        const subUsers = data.data.sub_users || [];
        
        console.log('Loaded sub-users:', subUsers);
        
        // Update sub-user select in transaction form
        updateSubUserDropdown(subUsers);
        
        if (!subUsers || subUsers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No sub-users found. Add a sub-user to get started!</p>
                </div>
            `;
            return;
        }
        
        // Clear loading message
        container.innerHTML = '';
        
        // Prepare HTML fragment for all cards at once
        const fragment = document.createDocumentFragment();
        
        // Create a batch request array
        const subUserIds = subUsers.map(subUser => subUser.sub_user_id).filter(Boolean);
        
        // Fetch all sub-user transaction data in a single batch request
        let subUserTransactionsMap = {};
        
        try {
            // Get all transactions in a single fetch
            const budgetTransactionsResponse = await fetch(`/api/budgets/${budgetId}/transactions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (budgetTransactionsResponse.ok) {
                const transactionsData = await budgetTransactionsResponse.json();
                const allTransactions = transactionsData.data || [];
                
                // Group transactions by sub-user
                subUserIds.forEach(subUserId => {
                    const filteredTransactions = allTransactions.filter(
                        transaction => transaction.sub_user_id === subUserId
                    );
                    subUserTransactionsMap[subUserId] = filteredTransactions;
                });
            }
        } catch (error) {
            console.error('Error fetching batch transactions:', error);
        }
        
        // Process all sub-users at once
        subUsers.forEach(subUser => {
            // Skip non-object entries
            if (!subUser || typeof subUser !== 'object') return;
            
            const status = subUser.sub_payment_status || 'unpaid';
            let availableCredit = parseFloat(subUser.credit_limit || 0);
            
            // Calculate available credit from cached transactions
            if (subUser.sub_user_id && subUserTransactionsMap[subUser.sub_user_id]) {
                const transactions = subUserTransactionsMap[subUser.sub_user_id];
                
                let totalExpenses = 0;
                let totalPayments = 0;
                
                transactions.forEach(transaction => {
                    const amount = parseFloat(transaction.amount);
                    if (amount < 0) {
                        totalExpenses += Math.abs(amount);
                    } else {
                        totalPayments += amount;
                    }
                });
                
                const usedCredit = totalExpenses - totalPayments;
                availableCredit = Math.max(0, availableCredit - usedCredit);
            }
            
            const isMainBudget = subUser.sub_user_name === 'Main Budget';
            
            // Create card
            const card = createSubUserCard(subUser, status, availableCredit, isMainBudget);
            fragment.appendChild(card);
        });
        
        // Append all cards at once for better performance
        container.appendChild(fragment);
        
    } catch (error) {
        console.error('Error loading sub-users:', error);
        document.getElementById('sub-users-list').innerHTML = `
            <div class="empty-state">
                <p>Error loading sub-users. Please try again later.</p>
            </div>
        `;
    }
}

// Helper function to update the sub-user dropdown
function updateSubUserDropdown(subUsers) {
    const selectElement = document.getElementById('sub_user_id');
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">None (Main Budget)</option>';
    
    subUsers.forEach(subUser => {
        if (subUser.sub_user_name === 'Main Budget') return;
        
        const option = document.createElement('option');
        option.value = subUser.sub_user_id;
        option.textContent = subUser.sub_user_name;
        selectElement.appendChild(option);
    });
}

// Helper function to create a sub-user card
function createSubUserCard(subUser, status, availableCredit, isMainBudget) {
            const card = document.createElement('div');
            card.className = 'sub-user-card';
            card.setAttribute('data-id', subUser.sub_user_id);
            
            card.innerHTML = `
                <div class="sub-user-header">
                    <h3>${subUser.sub_user_name}</h3>
                    <span class="payment-status status-${status}">
                        ${status.toUpperCase()}
                    </span>
                </div>
                <div class="sub-user-details">
                    <div class="detail-row">
                        <span class="label">Credit Limit:</span>
                        <span>₱${parseFloat(subUser.credit_limit || 0).toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Available Credit:</span>
                        <span class="available-credit-value">₱${availableCredit.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Period:</span>
                        <span>${new Date(subUser.start_date).toLocaleDateString()} - ${subUser.end_date ? new Date(subUser.end_date).toLocaleDateString() : 'Ongoing'}</span>
                    </div>
                </div>
                ${!isMainBudget ? `
                <div class="sub-user-actions">
                    <button class="btn-icon edit-sub-user" data-id="${subUser.sub_user_id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-sub-user" data-id="${subUser.sub_user_id}" 
                            data-name="${subUser.sub_user_name}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            `;
            
            // Add event listeners for edit and delete buttons
            if (!isMainBudget) {
                const editBtn = card.querySelector('.edit-sub-user');
                const deleteBtn = card.querySelector('.delete-sub-user');
                
                editBtn.addEventListener('click', () => editSubUser(subUser));
                deleteBtn.addEventListener('click', () => confirmDeleteSubUser(subUser.sub_user_id, subUser.sub_user_name));
            }
    
    return card;
}

// Optimized transaction form to only check credit limit on submission
function setupTransactionForm(budgetId) {
    const form = document.getElementById('add-transaction-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('transaction_date');
    const subUserSelect = document.getElementById('sub_user_id');
    const amountTypeRadios = document.querySelectorAll('input[name="amount_type"]');
    const warningDiv = document.getElementById('credit-limit-warning');
    
    // Cache for credit limit values to reduce API calls
    const creditLimitCache = {};
    
    // Modify the showCreditWarning function to only show warnings in the form itself
    function showCreditWarning() {
        const amountType = document.querySelector('input[name="amount_type"]:checked').value;
        if (amountType !== 'expense') {
            warningDiv.classList.add('hidden');
            amountInput.classList.remove('warning');
            return;
        }
        
        const amount = parseFloat(amountInput.value) || 0;
        if (isNaN(amount) || amount <= 0) {
            warningDiv.classList.add('hidden');
            return;
        }
        
        const subUserId = subUserSelect.value;
        let availableCredit = 0;
        
        if (subUserId && creditLimitCache[subUserId]) {
            availableCredit = creditLimitCache[subUserId];
        } else if (!subUserId && creditLimitCache['main']) {
            availableCredit = creditLimitCache['main'];
        } else {
            // Don't show warning if we don't have cached data
            warningDiv.classList.add('hidden');
            return;
        }
        
        // Show warning based on cached data - only in the form
        if (amount > availableCredit) {
            warningDiv.classList.remove('hidden');
            warningDiv.querySelector('span').textContent = 
                `This expense (₱${amount.toFixed(2)}) exceeds the available credit (₱${availableCredit.toFixed(2)})`;
            amountInput.classList.add('warning');
        } else if (amount > availableCredit * 0.9) {
            warningDiv.classList.remove('hidden');
            warningDiv.querySelector('span').textContent = 
                `This expense will use most of the available credit (₱${availableCredit.toFixed(2)})`;
            amountInput.classList.add('warning');
        } else {
            warningDiv.classList.add('hidden');
            amountInput.classList.remove('warning');
        }
    }
    
    // Form validation function - modify to use muted error styling
    function validateForm() {
        let isValid = true;
        
        // Validate description
        if (!descriptionInput.value.trim()) {
            isValid = false;
            descriptionInput.classList.add('input-error');
        } else {
            descriptionInput.classList.remove('input-error');
        }
        
        // Validate amount - just check if it's a positive number
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            isValid = false;
            amountInput.classList.add('input-error');
        } else {
            amountInput.classList.remove('input-error');
        }
        
        // Validate date
        if (!dateInput.value) {
            isValid = false;
            dateInput.classList.add('input-error');
        } else {
            dateInput.classList.remove('input-error');
        }
        
        // Enable/disable submit button based on validation
        submitBtn.disabled = !isValid;
        
        return isValid;
    }
    
    // One-time credit limit check to populate cache
    async function initializeCreditLimits() {
        try {
            // Get main budget credit limit
            const totalLimit = parseFloat(document.getElementById('total-limit').textContent.replace(/[₱,]/g, '')) || 0;
            const currentBalance = parseFloat(document.getElementById('current-balance').textContent.replace(/[₱,]/g, '')) || 0;
            creditLimitCache['main'] = Math.max(0, totalLimit - currentBalance);
            
            // Get sub-user credit limits from their cards
            const subUserCards = document.querySelectorAll('.sub-user-card');
            subUserCards.forEach(card => {
                const subUserId = card.getAttribute('data-id');
                if (!subUserId) return;
                
                const availableCreditEl = card.querySelector('.available-credit-value');
                if (availableCreditEl) {
                    const availableCredit = parseFloat(availableCreditEl.textContent.replace(/[₱,]/g, '')) || 0;
                    creditLimitCache[subUserId] = availableCredit;
                }
            });
        } catch (error) {
            console.error('Error initializing credit limits:', error);
        }
    }
    
    // Modify the form submission handler to only show notification after clicking Save
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        // Set loading state
        submitBtn.disabled = true;
        const originalButtonText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        
        try {
            // Get form values
            let amount = parseFloat(amountInput.value);
            const amountType = document.querySelector('input[name="amount_type"]:checked').value;
            const subUserId = subUserSelect.value;
            
            // For expenses, check credit limit and send negative amount
            if (amountType === 'expense') {
                amount = -Math.abs(amount);
                
                // Check credit limit at submission time
                let availableCredit = 0;
                
                if (subUserId) {
                    // Get fresh credit limit from API
                    const response = await fetch(`/api/sub-users/${subUserId}/credit-status`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        availableCredit = parseFloat(data.available_credit || 0);
                    } else {
                        // Fallback to getting the sub-user data
                        const subUserResponse = await fetch(`/api/sub-users/${subUserId}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });
                        
                        if (subUserResponse.ok) {
                            const subUserData = await subUserResponse.json();
                            const subUser = subUserData.data.sub_user || subUserData.data;
                            availableCredit = parseFloat(subUser.credit_limit || 0);
                        }
                    }
                } else {
                    // Use main budget credit limit
                    const totalLimit = parseFloat(document.getElementById('total-limit').textContent.replace(/[₱,]/g, '')) || 0;
                    const currentBalance = parseFloat(document.getElementById('current-balance').textContent.replace(/[₱,]/g, '')) || 0;
                    availableCredit = Math.max(0, totalLimit - currentBalance);
                }
                
                // Enforce credit limit - only show notification after clicking
                if (Math.abs(amount) > availableCredit) {
                    // Show notification
                    showNotification('error', `Transaction not allowed: Expense amount (₱${Math.abs(amount).toFixed(2)}) exceeds available credit (₱${availableCredit.toFixed(2)})`);
                    
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalButtonText;
                    return;
                }
            }
            
            // Build the request payload
            const formData = {
                description: descriptionInput.value.trim(),
                amount: amount,
                transaction_date: dateInput.value,
                sub_user_id: subUserId || null
            };
            
            console.log('Submitting transaction:', formData);
            
            // Send API request
            const response = await fetch(`/api/budgets/${budgetId}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });
            
            const responseData = await response.json();
            console.log('Transaction API response:', responseData);
            
            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to add transaction');
            }
            
            // Close modal and reset form
            document.getElementById('add-transaction-modal').style.display = 'none';
            form.reset();
            
            // Show success notification
            showNotification('success', 'Transaction added successfully!');
            
            // Refresh data
            await refreshAllData(budgetId);
        } catch (error) {
            console.error('Error adding transaction:', error);
            showNotification('error', error.message || 'Failed to add transaction');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonText;
        }
    });
    
    // Add event listeners for basic input validation
    descriptionInput.addEventListener('input', validateForm);
    amountInput.addEventListener('input', () => {
        validateForm();
        showCreditWarning(); // Only use cached data for warnings
    });
    dateInput.addEventListener('change', validateForm);
    
    // Add event listeners for changing form options
    subUserSelect.addEventListener('change', showCreditWarning);
    amountTypeRadios.forEach(radio => {
        radio.addEventListener('change', showCreditWarning);
    });
    
    // Initialize credit limits once when the form is set up
    initializeCreditLimits();
    
    // Initial validation
    validateForm();
}

function setupSubUserForm(budgetId) {
    const form = document.getElementById('add-sub-user-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const nameInput = document.getElementById('sub_user_name');
    const creditLimitInput = document.getElementById('credit_limit');
    const startDateInput = document.getElementById('start_date');
    const endDateInput = document.getElementById('end_date');
    
    // Input validation
    nameInput.addEventListener('input', validateForm);
    creditLimitInput.addEventListener('input', validateForm);
    startDateInput.addEventListener('change', validateForm);
    endDateInput.addEventListener('change', validateForm);
    
    function validateForm() {
        let isValid = true;
        
        // Validate name
        if (!nameInput.value.trim()) {
            isValid = false;
            nameInput.classList.add('error');
        } else {
            nameInput.classList.remove('error');
        }
        
        // Validate credit limit
        const creditLimit = parseFloat(creditLimitInput.value);
        if (isNaN(creditLimit) || creditLimit < 0) {
            isValid = false;
            creditLimitInput.classList.add('error');
        } else {
            creditLimitInput.classList.remove('error');
        }
        
        // Validate start date
        if (!startDateInput.value) {
            isValid = false;
            startDateInput.classList.add('error');
        } else {
            startDateInput.classList.remove('error');
        }
        
        // Validate end date (if provided) is after start date
        if (endDateInput.value && startDateInput.value) {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            if (endDate <= startDate) {
                isValid = false;
                endDateInput.classList.add('error');
            } else {
                endDateInput.classList.remove('error');
            }
        } else {
            endDateInput.classList.remove('error');
        }
        
        // Update submit button state
        submitBtn.disabled = !isValid;
    }
    
    // Initial validation
    validateForm();
    
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Set loading state
        submitBtn.disabled = true;
        const originalButtonText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        
        const formData = {
            sub_user_name: nameInput.value.trim(),
            credit_limit: parseFloat(creditLimitInput.value) || 0,
            start_date: startDateInput.value,
            end_date: endDateInput.value || null
        };
        
        try {
            const response = await fetch(`/api/budgets/${budgetId}/sub-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add sub-user');
            }
            
            // Get the response data
            const data = await response.json();
            
            // Close modal and reset form
            document.getElementById('add-sub-user-modal').style.display = 'none';
            form.reset();
            
            // Reload data
            await loadSubUsers(budgetId);
            // Also reload transactions to update the sub-user dropdown
            await loadTransactions(budgetId);
            
            // Show success notification
            showNotification('success', 'Sub-user added successfully!');
            
            // Force a complete refresh of all data
            await refreshAllData(budgetId);
        } catch (error) {
            console.error('Error adding sub-user:', error);
            showNotification('error', error.message || 'Failed to add sub-user. Please try again.');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonText;
        }
    });
}

function setupEditBudgetForm(budgetId) {
    const form = document.getElementById('edit-budget-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const totalLimitInput = document.getElementById('edit_total_limit');
    const budgetNameInput = document.getElementById('edit_budget_name');
    
    // Add input validation
    totalLimitInput.addEventListener('input', validateForm);
    budgetNameInput.addEventListener('input', validateForm);
    
    function validateForm() {
        let isValid = true;
        
        // Validate budget name
        if (!budgetNameInput.value.trim()) {
            isValid = false;
            budgetNameInput.classList.add('error');
        } else {
            budgetNameInput.classList.remove('error');
        }
        
        // Validate total limit - ensure it's greater than 0
        const totalLimit = parseFloat(totalLimitInput.value);
        if (isNaN(totalLimit) || totalLimit <= 0) {
            isValid = false;
            totalLimitInput.classList.add('error');
        } else {
            totalLimitInput.classList.remove('error');
        }
        
        // Update submit button state
        submitBtn.disabled = !isValid;
    }
    
    // Initial validation
    validateForm();
    
    form.addEventListener('submit', async function(event) {
        // This prevents the default form submission behavior
        event.preventDefault();
        
        // Get the budget ID from the URL
        const pathParts = window.location.pathname.split('/');
        const budgetId = pathParts[pathParts.length - 1];
        
        // Get form data
        const formData = {
            budget_name: document.getElementById('edit_budget_name').value,
            total_limit: parseFloat(document.getElementById('edit_total_limit').value),
            payment_due_date: document.getElementById('edit_payment_due_date').value || null,
            billing_cycle_start: document.getElementById('edit_billing_cycle_start').value || null,
            billing_cycle_end: document.getElementById('edit_billing_cycle_end').value || null
        };
        
        console.log('Updating budget with data:', formData);
        
        try {
            // Make API request with correct URL, method, and headers
            const response = await fetch(`/api/budgets/${budgetId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update budget');
            }
            
            const data = await response.json();
            
            // Close modal
            document.getElementById('edit-budget-modal').style.display = 'none';
            
            // Reload budget details to show updated data
            await loadBudgetDetails(budgetId);
            
            // Show success message
            alert('Budget updated successfully!');
            
            // Force a complete refresh of all data
            await refreshAllData(budgetId);
        } catch (error) {
            console.error('Error updating budget:', error);
            alert(error.message || 'Failed to update budget. Please try again.');
        }
    });
}

// Function to open edit sub-user modal and pre-fill form
function editSubUser(subUser) {
    // Populate form fields
    document.getElementById('edit_sub_user_id').value = subUser.sub_user_id;
    document.getElementById('edit_sub_user_name').value = subUser.sub_user_name;
    document.getElementById('edit_credit_limit').value = subUser.credit_limit;
    
    // Format dates for input fields (YYYY-MM-DD)
    if (subUser.start_date) {
        const startDate = new Date(subUser.start_date);
        document.getElementById('edit_start_date').value = startDate.toISOString().split('T')[0];
    }
    
    if (subUser.end_date) {
        const endDate = new Date(subUser.end_date);
        document.getElementById('edit_end_date').value = endDate.toISOString().split('T')[0];
    } else {
        document.getElementById('edit_end_date').value = '';
    }
    
    // Show modal
    document.getElementById('edit-sub-user-modal').style.display = 'flex';
}

// Function to show delete confirmation modal
function confirmDeleteSubUser(subUserId, subUserName) {
    // Populate confirmation modal
    document.getElementById('delete-sub-user-name').textContent = subUserName;
    document.getElementById('delete_sub_user_id').value = subUserId;
    
    // Show modal
    document.getElementById('delete-sub-user-modal').style.display = 'flex';
}

// Setup the edit sub-user form submission
function setupEditSubUserForm(budgetId) {
    const form = document.getElementById('edit-sub-user-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const creditLimitInput = document.getElementById('edit_credit_limit');
    
    // Add input validation
    creditLimitInput.addEventListener('input', validateEditSubUserForm);
    
    function validateEditSubUserForm() {
        // Validate credit limit (should be positive or zero)
        const creditLimit = parseFloat(creditLimitInput.value);
        if (isNaN(creditLimit) || creditLimit < 0) {
            creditLimitInput.classList.add('error');
            submitBtn.disabled = true;
        } else {
            creditLimitInput.classList.remove('error');
            submitBtn.disabled = false;
        }
    }
    
    // Initial validation
    validateEditSubUserForm();
    
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Set loading state
        submitBtn.disabled = true;
        const originalButtonText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const subUserId = document.getElementById('edit_sub_user_id').value;
        
        const formData = {
            sub_user_name: document.getElementById('edit_sub_user_name').value.trim(),
            credit_limit: parseFloat(document.getElementById('edit_credit_limit').value) || 0,
            start_date: document.getElementById('edit_start_date').value,
            end_date: document.getElementById('edit_end_date').value || null
        };
        
        try {
            const response = await fetch(`/api/sub-users/${subUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update sub-user');
            }
            
            // Close modal
            document.getElementById('edit-sub-user-modal').style.display = 'none';
            
            // Only do a single refresh instead of multiple
            await refreshAllData(budgetId);
            
            // Show success notification
            showNotification('success', 'Sub-user updated successfully!');
        } catch (error) {
            console.error('Error updating sub-user:', error);
            showNotification('error', error.message || 'Failed to update sub-user. Please try again.');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonText;
        }
    });
}

// Setup the delete sub-user handler
function setupDeleteSubUserHandler(budgetId) {
    const confirmBtn = document.getElementById('confirm-delete-sub-user');
    
    confirmBtn.addEventListener('click', async () => {
        // Set loading state
        confirmBtn.disabled = true;
        const originalButtonText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        
        const subUserId = document.getElementById('delete_sub_user_id').value;
        
        try {
            const response = await fetch(`/api/sub-users/${subUserId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete sub-user');
            }
            
            // Close modal
            document.getElementById('delete-sub-user-modal').style.display = 'none';
            
            // Do a single refresh call instead of multiple
            await refreshAllData(budgetId);
            
            // Show success notification
            showNotification('success', 'Sub-user deleted successfully!');
        } catch (error) {
            console.error('Error deleting sub-user:', error);
            showNotification('error', error.message || 'Failed to delete sub-user. Please try again.');
        } finally {
            // Reset button state
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalButtonText;
        }
    });
}

// Helper function to handle API errors
function handleApiError(error, message) {
    console.error(`${message}:`, error);
    
    if (error.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
    }
    
    return `<div class="empty-state error">
        <p>${message}</p>
    </div>`;
}

// Format currency helper
function formatCurrency(amount) {
    return `₱${parseFloat(amount).toFixed(2)}`;
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
}

// Add notification function
function showNotification(type, message, autoRemove = true) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
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
        notification.remove();
    });
    
    // Auto remove after 5 seconds (if autoRemove is true)
    if (autoRemove) {
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (!sidebarToggle) return;
    
    sidebarToggle.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
    });
}

// Add this helper function to calculate available credit
function calculateAvailableCredit(subUser) {
    // If we have the available_credit property directly from the API
    if (subUser.available_credit !== undefined) {
        return parseFloat(subUser.available_credit).toFixed(2);
    }
    
    // Otherwise use transactions to calculate it on the client-side
    // This needs the API to return all transactions with the sub-user data
    if (subUser.transactions) {
        let expenses = 0;
        let payments = 0;
        
        subUser.transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount);
            if (amount < 0) {
                expenses += Math.abs(amount);
            } else {
                payments += amount;
            }
        });
        
        const usedCredit = expenses - payments;
        const availableCredit = Math.max(0, parseFloat(subUser.credit_limit || 0) - usedCredit);
        return availableCredit.toFixed(2);
    }
    
    // If no data available, return the full credit limit
    return parseFloat(subUser.credit_limit || 0).toFixed(2);
}

// Function to open edit transaction modal and pre-fill form
function editTransaction(transaction) {
    console.log('Editing transaction:', transaction);
    
    try {
        // Get transaction ID (handle both 'id' and 'transaction_id' fields)
        const transactionId = transaction.transaction_id || transaction.id;
        
        // Ensure we have a valid transaction with an ID
        if (!transaction || !transactionId) {
            console.error("Transaction or transaction ID is missing:", transaction);
            showNotification('error', 'Invalid transaction data');
            return;
        }
        
        // Store transaction ID in a data attribute on the form itself for safety
        const form = document.getElementById('edit-transaction-form');
        form.setAttribute('data-transaction-id', transactionId);
        
        // Also set the hidden input field
        const transactionIdField = document.getElementById('edit_transaction_id');
        transactionIdField.value = transactionId;
        console.log(`Set transaction ID: ${transactionId}`);
        
        // Pre-fill the form fields
        document.getElementById('edit_description').value = transaction.description;
        
        // Handle amount (determine if it's expense or payment)
        const amount = parseFloat(transaction.amount);
        const isExpense = amount < 0;
        
        document.getElementById('edit_amount').value = Math.abs(amount);
        
        // Set appropriate radio button
        if (isExpense) {
            document.querySelector('input[name="edit_amount_type"][value="expense"]').checked = true;
        } else {
            document.querySelector('input[name="edit_amount_type"][value="payment"]').checked = true;
        }
        
        // Format date for input (YYYY-MM-DD)
        if (transaction.transaction_date) {
            const transactionDate = new Date(transaction.transaction_date);
            document.getElementById('edit_transaction_date').value = transactionDate.toISOString().split('T')[0];
        }
        
        // Handle sub-user dropdown
        const editSubUserSelect = document.getElementById('edit_sub_users_id');
        
        // Clear existing options
        editSubUserSelect.innerHTML = '<option value="">None (Main Budget)</option>';
        
        // Get source options from the add transaction form
        const sourceSelect = document.getElementById('sub_user_id');
        
        // Copy options from source dropdown
        if (sourceSelect && sourceSelect.options && sourceSelect.options.length > 0) {
            for (let i = 1; i < sourceSelect.options.length; i++) {
                const option = document.createElement('option');
                option.value = sourceSelect.options[i].value;
                option.textContent = sourceSelect.options[i].textContent;
                editSubUserSelect.appendChild(option);
            }
        }
        
        // If this transaction has a sub-user, set it in the dropdown
        if (transaction.sub_user) {
            const subUserId = (transaction.sub_user.sub_user_id || transaction.sub_user.id).toString();
            const subUserName = transaction.sub_user.sub_user_name;
            
            console.log(`Transaction has sub-user: ${subUserName} (ID: ${subUserId})`);
            
            // Check if option exists
            let optionExists = false;
            for (let i = 0; i < editSubUserSelect.options.length; i++) {
                if (editSubUserSelect.options[i].value === subUserId) {
                    optionExists = true;
                    break;
                }
            }
            
            // Add option if it doesn't exist
            if (!optionExists) {
                const option = document.createElement('option');
                option.value = subUserId;
                option.textContent = subUserName;
                editSubUserSelect.appendChild(option);
                console.log(`Added sub-user option: ${subUserName} (ID: ${subUserId})`);
            }
            
            // Set selected value
            editSubUserSelect.value = subUserId;
            console.log(`Selected sub-user: ${subUserName} (ID: ${subUserId})`);
        } else {
            // If no sub-user, select "None (Main Budget)"
            editSubUserSelect.value = '';
            console.log('Transaction has no sub-user, selecting "None (Main Budget)"');
        }
        
        // Show modal
        document.getElementById('edit-transaction-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error preparing edit transaction form:', error);
        showNotification('error', 'Error preparing edit form. Please try again.');
    }
}

// Function to show delete confirmation modal
function confirmDeleteTransaction(transaction) {
    // Make sure we have a valid transaction ID
    const transactionId = transaction.transaction_id || transaction.id;
    
    if (!transactionId) {
        console.error('Missing transaction ID for delete operation:', transaction);
        showNotification('error', 'Cannot delete transaction: Missing ID');
        return;
    }
    
    console.log(`Confirming delete for transaction ID: ${transactionId}`);
    
    // Format amount for display
    const amount = parseFloat(transaction.amount);
    const isExpense = amount < 0;
    const formattedAmount = `₱${Math.abs(amount).toFixed(2)}`;
    
    // Format date
    const date = new Date(transaction.transaction_date).toLocaleDateString();
    
    // Populate confirmation modal
    document.getElementById('delete-transaction-summary').innerHTML = `
        <strong>Description:</strong> ${transaction.description}<br>
        <strong>Amount:</strong> ${isExpense ? '-' : '+'}${formattedAmount}<br>
        <strong>Date:</strong> ${date}<br>
        <strong>Sub-User:</strong> ${transaction.sub_user ? transaction.sub_user.sub_user_name : 'Main Budget'}
    `;
    
    // Set the transaction ID in the hidden field
    document.getElementById('delete_transaction_id').value = transactionId;
    
    // Show modal
    document.getElementById('delete-transaction-modal').style.display = 'flex';
}

// Setup the edit transaction form submission
function setupEditTransactionForm(budgetId) {
    const form = document.getElementById('edit-transaction-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const amountInput = document.getElementById('edit_amount');
    const descriptionInput = document.getElementById('edit_description');
    const dateInput = document.getElementById('edit_transaction_date');
    
    // Add input validation
    amountInput.addEventListener('input', validateForm);
    descriptionInput.addEventListener('input', validateForm);
    dateInput.addEventListener('change', validateForm);
    
    function validateForm() {
        let isValid = true;
        
        // Validate description
        if (!descriptionInput.value.trim()) {
            isValid = false;
            descriptionInput.classList.add('error');
        } else {
            descriptionInput.classList.remove('error');
        }
        
        // Validate amount - ensure amount is positive
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            isValid = false;
            amountInput.classList.add('error');
        } else {
            amountInput.classList.remove('error');
        }
        
        // Validate date
        if (!dateInput.value) {
            isValid = false;
            dateInput.classList.add('error');
        } else {
            dateInput.classList.remove('error');
        }
        
        // Update submit button state
        submitBtn.disabled = !isValid;
    }
    
    // Initial validation
    validateForm();
    
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Set loading state
        submitBtn.disabled = true;
        const originalButtonText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        // Get transaction ID
        let transactionId = document.getElementById('edit_transaction_id').value;
        
        // If ID is missing from input, try to get it from the form's data attribute
        if (!transactionId) {
            transactionId = form.getAttribute('data-transaction-id');
        }
        
        // Validate that we have a transaction ID
        if (!transactionId) {
            console.error('Transaction ID is missing or undefined');
            showNotification('error', 'Transaction ID is missing. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonText;
            return;
        }
        
        // Get form data
        let amount = parseFloat(document.getElementById('edit_amount').value);
        const amountType = document.querySelector('input[name="edit_amount_type"]:checked').value;
        
        // Apply sign based on expense/payment
        if (amountType === 'expense') {
            amount = -Math.abs(amount);
        } else {
            amount = Math.abs(amount);
        }
        
        // Get the selected sub-user
        const subUserSelect = document.getElementById('edit_sub_users_id');
        const subUserId = subUserSelect.value;
        
        // Check credit limit before submission if this is an expense
        if (amountType === 'expense' && subUserId) {
            try {
                const availableCredit = await getConsistentAvailableCredit(subUserId);
                showNotification('error', `This expense exceeds the available credit of ₱${availableCredit.toFixed(2)}. Transaction not allowed.`);
            } catch (error) {
                showNotification('error', 'Transaction not allowed: Expense amount exceeds available credit');
            }
        }
        
        // Create the form data object
        const formData = {
            description: document.getElementById('edit_description').value.trim(),
            amount: amount,
            transaction_date: document.getElementById('edit_transaction_date').value,
            sub_user_id: subUserId || null
        };
        
        try {
            // Send update request
            const response = await fetch(`/api/transactions/${transactionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            // Handle non-OK responses properly
            if (!response.ok) {
                const errorData = await response.json();
                // Use a generic error message instead of showing raw HTML errors
                showNotification('error', errorData.message || 'Failed to update transaction. Please try again.');
                
                // Don't throw an error - instead, handle it gracefully
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalButtonText;
                return;
            }
            
            // Process the successful response
            const data = await response.json();
            
            // Close modal
            document.getElementById('edit-transaction-modal').style.display = 'none';
            
            // Force clear any cached data
            document.getElementById('transactions-list').innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading transactions...
                </div>
            `;
            
            // Reload data
            await loadBudgetDetails(budgetId);
            await loadTransactions(budgetId);
            await loadSubUsers(budgetId);
            
            showNotification('success', 'Transaction updated successfully!');
        } catch (error) {
            // Provide a clean error message
            showNotification('error', 'Failed to update transaction. Please try again.');
            console.error('Error updating transaction:', error);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonText;
        }
    });
}

// Setup the delete transaction handler
function setupDeleteTransactionHandler(budgetId) {
    const confirmBtn = document.getElementById('confirm-delete-transaction');
    
    confirmBtn.addEventListener('click', async () => {
        // Set loading state
        confirmBtn.disabled = true;
        const originalButtonText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        
        const transactionId = document.getElementById('delete_transaction_id').value;
        
        if (!transactionId) {
            console.error('Transaction ID is missing or undefined');
            showNotification('error', 'Transaction ID is missing. Please try again.');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalButtonText;
            return;
        }
        
        console.log(`Attempting to delete transaction ID: ${transactionId}`);
        
        try {
            const response = await fetch(`/api/transactions/${transactionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                let errorMessage = 'Failed to delete transaction';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // If we can't parse the JSON, just use the default message
                }
                throw new Error(errorMessage);
            }
            
            // Close modal
            document.getElementById('delete-transaction-modal').style.display = 'none';
            
            // Show success notification
            showNotification('success', 'Transaction deleted successfully!');
            
            // Force a complete refresh of all data
            await refreshAllData(budgetId);
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showNotification('error', error.message || 'Failed to delete transaction. Please try again.');
        } finally {
            // Reset button state
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalButtonText;
        }
    });
}

// Add a function to fetch real-time available credit for sub-users
async function fetchSubUserAvailableCredit(subUserId) {
    try {
        const response = await fetch(`/api/sub-users/${subUserId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch sub-user data');
        }
        
        const data = await response.json();
        return data.data.available_credit || data.data.credit_limit || 0;
    } catch (error) {
        console.error('Error fetching available credit:', error);
        return 0;
    }
}

// Updated function to refresh sub-user data without using batch API
async function refreshSubUserData() {
    const subUserCards = document.querySelectorAll('.sub-user-card');
    if (subUserCards.length === 0) return;
    
    // Add loading indicators
    subUserCards.forEach(card => {
        const statusEl = card.querySelector('.payment-status');
        if (statusEl) {
            statusEl.innerHTML += ' <i class="fas fa-sync-alt fa-spin fa-xs"></i>';
        }
    });
    
    // Get the budget ID from URL
    const pathParts = window.location.pathname.split('/');
    const budgetId = pathParts[pathParts.length - 1];
    
    try {
        // Fetch all sub-users in one request instead of using the batch API
        const response = await fetch(`/api/budgets/${budgetId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const subUsers = data.data.sub_users || [];
            
            // Update cards with the fetched data
            subUserCards.forEach(card => {
                const subUserId = card.getAttribute('data-id');
                if (!subUserId) return;
                
                // Find matching sub-user data
                const subUser = subUsers.find(su => su.sub_user_id.toString() === subUserId);
                if (!subUser) return;
                
                // Update status
                const statusElement = card.querySelector('.payment-status');
                if (statusElement && subUser.sub_payment_status) {
                    statusElement.textContent = subUser.sub_payment_status.toUpperCase();
                    statusElement.className = `payment-status status-${subUser.sub_payment_status}`;
                }
                
                // Update credit
                const availableCreditElement = card.querySelector('.available-credit-value');
                if (availableCreditElement) {
                    const availableCredit = subUser.available_credit !== undefined
                        ? parseFloat(subUser.available_credit)
                        : parseFloat(subUser.credit_limit || 0);
                    availableCreditElement.textContent = `₱${availableCredit.toFixed(2)}`;
                    
                    // Add warning if credit is low or exhausted
                    if (availableCredit <= 0) {
                        availableCreditElement.classList.add('credit-exhausted');
                    } else if (subUser.credit_limit && (availableCredit / parseFloat(subUser.credit_limit)) < 0.1) {
                        availableCreditElement.classList.add('credit-low');
                    } else {
                        availableCreditElement.classList.remove('credit-exhausted', 'credit-low');
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error refreshing sub-user data:', error);
    } finally {
        // Remove loading indicators
        subUserCards.forEach(card => {
            const statusEl = card.querySelector('.payment-status');
            if (statusEl) {
                const loadingIcon = statusEl.querySelector('.fa-sync-alt');
                if (loadingIcon) {
                    loadingIcon.remove();
                }
            }
        });
    }
}

// Simplified version that doesn't use the batch API endpoints
async function forceUpdateSubUserStatus(subUserId) {
    try {
        // Fetch data for a single sub-user directly
        const response = await fetch(`/api/sub-users/${subUserId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const subUser = data.data;
            
            // Update the status in local storage
            if (subUser.sub_payment_status) {
                localStorage.setItem(`sub_user_status_${subUserId}`, subUser.sub_payment_status);
                return subUser.sub_payment_status;
            }
        }
    } catch (error) {
        console.error(`Error updating status for sub-user ${subUserId}:`, error);
    }
    
    // Return a default status from cache or 'unpaid' if not available
    return localStorage.getItem(`sub_user_status_${subUserId}`) || 'unpaid';
}

// Optimized refreshAllData function to prevent multiple duplicate calls
async function refreshAllData(budgetId) {
    try {
        // Show loading indicators
        document.getElementById('transactions-list').innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Loading data...
            </div>
        `;
        
        document.getElementById('sub-users-list').innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Loading data...
            </div>
        `;
        
        // Use Promise.all to run these requests in parallel
        // This prevents the waterfall loading pattern
        await Promise.all([
            loadBudgetDetails(budgetId),
            loadTransactions(budgetId),
            loadSubUsers(budgetId)
        ]);
        
        // Show success notification
        showNotification('success', 'Data refreshed successfully');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showNotification('error', 'Failed to refresh data. Please reload the page.');
    }
}

// Update the getSubUserStatus function to properly handle the UNPAID status when credit is exhausted
async function getSubUserStatus(subUserId) {
    try {
        // Get sub-user transactions
        const response = await fetch(`/api/sub-users/${subUserId}/transactions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to get sub-user transactions');
        }
        
        const data = await response.json();
        const transactions = data.data.transactions || [];
        
        // Get sub-user details to check available credit
        const subUserResponse = await fetch(`/api/sub-users/${subUserId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!subUserResponse.ok) {
            throw new Error('Failed to get sub-user details');
        }
        
        const subUserData = await subUserResponse.json();
        const availableCredit = parseFloat(subUserData.data.available_credit || 0);
        
        let totalExpenses = 0;
        let totalPayments = 0;
        
        transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount);
            if (amount < 0) {
                totalExpenses += Math.abs(amount);
            } else {
                totalPayments += amount;
            }
        });
        
        const netBalance = totalExpenses - totalPayments;
        
        if (totalExpenses === 0) {
            return 'paid'; // No expenses means nothing to pay
        } else if (netBalance <= 0) {
            return 'paid'; // All expenses covered
        } else if (totalPayments > 0 && availableCredit > 0) {
            return 'partially_paid'; // Some payments made and still has credit
        } else {
            return 'unpaid'; // No payments made or no credit left
        }
    } catch (error) {
        console.error('Error getting sub-user status:', error);
        return null;
    }
}

// Add a cache layer to prevent redundant API calls
const dataCache = {
    budgetDetails: null,
    transactions: null,
    subUsers: null,
    lastUpdated: {
        budgetDetails: 0,
        transactions: 0,
        subUsers: 0
    },
    cacheLifetime: 30000 // 30 seconds
};

// Helper function to update budget UI from data
function updateBudgetUI(budget) {
    // Update page title
    document.getElementById('budget-name').textContent = budget.budget_name;
    document.title = `${budget.budget_name} - Budget Details`;
    
    // Update payment status
    const statusElement = document.getElementById('payment-status');
    statusElement.textContent = budget.payment_status.toUpperCase();
    statusElement.className = `payment-status status-${budget.payment_status}`;
    
    // Update financial details
    const totalLimit = parseFloat(budget.total_limit) || 0;
    const currentBalance = parseFloat(budget.current_balance) || 0;
    const availableCredit = Math.max(0, totalLimit - currentBalance);
    
    // Format with thousands separators for better readability
    document.getElementById('total-limit').textContent = `₱${totalLimit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('current-balance').textContent = `₱${currentBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const availableCreditElement = document.getElementById('available-credit');
    availableCreditElement.textContent = `₱${availableCredit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Remove existing credit status classes
    availableCreditElement.classList.remove('credit-exhausted', 'credit-low');
    
    // Add appropriate credit status class
    if (availableCredit <= 0) {
        availableCreditElement.classList.add('credit-exhausted');
    } else if (totalLimit > 0 && (availableCredit / totalLimit) < 0.1) {
        availableCreditElement.classList.add('credit-low');
    }
    
    // Calculate and update progress bar (capped at 100%)
    const percentUsed = Math.min(100, totalLimit > 0 ? (currentBalance / totalLimit) * 100 : 0);
    const progressBar = document.getElementById('budget-progress');
    progressBar.style.width = `${percentUsed}%`;
    
    // Add color indicator based on usage
    progressBar.classList.remove('warning', 'danger');
    if (percentUsed >= 90) {
        progressBar.classList.add('danger');
    } else if (percentUsed >= 75) {
        progressBar.classList.add('warning');
    }
    
    // Update date information
    const dueDate = budget.payment_due_date ? new Date(budget.payment_due_date).toLocaleDateString() : 'Not set';
    document.getElementById('payment-due-date').textContent = dueDate;
    
    const billingStart = budget.billing_cycle_start ? new Date(budget.billing_cycle_start).toLocaleDateString() : 'Not set';
    const billingEnd = budget.billing_cycle_end ? new Date(budget.billing_cycle_end).toLocaleDateString() : 'Not set';
    document.getElementById('billing-cycle').textContent = `${billingStart} to ${billingEnd}`;
    
    // Pre-fill edit form
    document.getElementById('edit_budget_name').value = budget.budget_name;
    document.getElementById('edit_total_limit').value = budget.total_limit;
    
    if (budget.payment_due_date) {
        document.getElementById('edit_payment_due_date').value = budget.payment_due_date.split('T')[0];
    }
    
    if (budget.billing_cycle_start) {
        document.getElementById('edit_billing_cycle_start').value = budget.billing_cycle_start.split('T')[0];
    }
    
    if (budget.billing_cycle_end) {
        document.getElementById('edit_billing_cycle_end').value = budget.billing_cycle_end.split('T')[0];
    }
    
    // Check available credit after updating UI
    if (availableCredit <= 0) {
        // Show notification only if this is a fresh check (not on page initial load)
        if (dataCache.budgetDetails) {
            showNotification('error', 'You have no available credit left. You cannot add any more expenses until you increase your limit or make a payment.');
        }
    }
}

// Add this new function to handle theme preferences
function setupThemePreference() {
    // Apply theme from localStorage (if exists)
    const body = document.body;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        body.setAttribute('data-theme', 'dark');
        
        // Update theme toggle button if it exists
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const themeIcon = themeToggle.querySelector('i');
            if (themeIcon) {
                themeIcon.classList.replace('fa-moon', 'fa-sun');
            }
        }
    }
    
    // Add event listener for theme toggle if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                
                const themeIcon = themeToggle.querySelector('i');
                if (themeIcon) {
                    themeIcon.classList.replace('fa-sun', 'fa-moon');
                }
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                
                const themeIcon = themeToggle.querySelector('i');
                if (themeIcon) {
                    themeIcon.classList.replace('fa-moon', 'fa-sun');
                }
            }
        });
    }
}

// Add this function to check available credit and show notifications
function checkAvailableCredit() {
    const availableCreditElement = document.getElementById('available-credit');
    if (!availableCreditElement) return;
    
    // Parse the available credit (remove currency symbol and commas)
    const availableCredit = parseFloat(availableCreditElement.textContent.replace(/[₱,]/g, ''));
    const totalLimit = parseFloat(document.getElementById('total-limit').textContent.replace(/[₱,]/g, ''));
    
    // Check if credit is zero
    if (availableCredit <= 0) {
        showNotification('error', 'You have no available credit left. You cannot add any more expenses until you increase your limit or make a payment.');
        
        // Add visual indicator to the available credit display
        availableCreditElement.classList.add('credit-exhausted');
        
        // Add a red border to highlight no available credit
        const budgetSummary = document.querySelector('.budget-summary');
        if (budgetSummary) {
            budgetSummary.classList.add('no-credit-available');
        }
    } 
    // Check if credit is running low (less than 10% of total limit)
    else if (totalLimit > 0 && (availableCredit / totalLimit) < 0.1) {
        showNotification('warning', `Your available credit is running low (₱${availableCredit.toFixed(2)}). Consider making a payment or increasing your limit.`);
        
        // Add visual indicator
        availableCreditElement.classList.add('credit-low');
    }
}

// Modified getConsistentAvailableCredit function with improved error handling
async function getConsistentAvailableCredit(subUserId) {
    // Use a cache with time expiration to avoid repeated API calls
    if (!window.creditCache) {
        window.creditCache = {};
    }
    
    // Check if we have a recent cache entry (less than 5 seconds old)
    const now = Date.now();
    if (window.creditCache[subUserId] && (now - window.creditCache[subUserId].timestamp < 5000)) {
        console.log(`Using cached credit for sub-user ${subUserId}`);
        return window.creditCache[subUserId].credit;
    }
    
    try {
        console.log(`Fetching credit status for sub-user ${subUserId}`);
        
        // Make a single API call to get both transactions and credit limit
        const response = await fetch(`/api/sub-users/${subUserId}/credit-status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Credit status data:', data);
            
            const availableCredit = parseFloat(data.available_credit || 0);
            
            // Cache the result with a timestamp
            window.creditCache[subUserId] = {
                credit: availableCredit,
                timestamp: now
            };
            
            return availableCredit;
        } else {
            const errorData = await response.json();
            console.error('Credit status error response:', errorData);
            throw new Error(`Failed to get credit status: ${errorData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error calculating available credit:', error);
        
        // Use cached value if available, even if expired
        if (window.creditCache[subUserId]) {
            console.log(`Using expired cached credit for sub-user ${subUserId}`);
            return window.creditCache[subUserId].credit;
        }
        
        console.log('Falling back to direct sub-user fetch');
        
        // Fall back to a basic credit limit check
        try {
            const response = await fetch(`/api/sub-users/${subUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Fallback sub-user data:', data);
                
                const subUser = data.data.sub_user || data.data;
                const creditLimit = parseFloat(subUser.credit_limit || 0);
                
                // Cache this value as a fallback
                window.creditCache[subUserId] = {
                    credit: creditLimit,
                    timestamp: now
                };
                
                return creditLimit;
            } else {
                console.error('Fallback fetch failed with status:', response.status);
                throw new Error('Failed to fetch sub-user data');
            }
        } catch (innerError) {
            console.error('Fallback credit limit fetch failed:', innerError);
        }
        
        // If all else fails, return a reasonable default value
        console.warn('Using default credit limit as last resort');
        return 10000;
    }
}