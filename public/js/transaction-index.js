document.addEventListener('DOMContentLoaded', function() {
    // Check for authentication
    const authToken = localStorage.getItem('token');
    if (!authToken) {
        window.location.href = '/';
        return;
    }
    
    // Cache for API data
    const dataCache = {
        budgets: null,
        transactions: null,
        lastFetched: {
            budgets: 0,
            transactions: 0
        },
        // Cache lifetime in milliseconds (30 seconds)
        cacheDuration: 30000
    };
    
    // Initialize page
    initializeTransactionsPage();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup theme preference
    setupThemePreference();
    
    /**
     * Initialize the transactions page
     */
    async function initializeTransactionsPage() {
        showLoader();
        
        try {
            // Load budgets and transactions in parallel for better performance
            await Promise.all([
                loadBudgetsForFilter(),
                loadTransactions(1)
            ]);
        } catch (error) {
            console.error('Error initializing page:', error);
            showNotification('Error loading data. Please try again.', 'error');
        } finally {
            hideLoader();
        }
    }
    
    /**
     * Set up event listeners for the page
     */
    function setupEventListeners() {
        // Sidebar toggle for mobile
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function() {
                document.querySelector('.sidebar').classList.toggle('active');
            });
        }
        
        // Search functionality with debounce
        const searchInput = document.getElementById('transaction-search');
        const searchBtn = document.getElementById('search-btn');
        
        if (searchBtn && searchInput) {
            // Debounce function to improve performance
            const debounce = (func, delay) => {
                let debounceTimer;
                return function() {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => func(), delay);
                };
            };
            
            // Search on button click
            searchBtn.addEventListener('click', function() {
                loadTransactions(1);
            });
            
            // Debounced search on input
            searchInput.addEventListener('input', debounce(function() {
                loadTransactions(1);
            }, 500));
            
            // Search on Enter key
            searchInput.addEventListener('keyup', function(event) {
                if (event.key === 'Enter') {
                    loadTransactions(1);
                }
            });
        }
        
        // Filter change events
        const budgetFilter = document.getElementById('budget-filter');
        const typeFilter = document.getElementById('type-filter');
        const dateFilter = document.getElementById('date-filter');
        
        if (budgetFilter) {
            budgetFilter.addEventListener('change', function() {
                loadTransactions(1);
            });
        }
        
        if (typeFilter) {
            typeFilter.addEventListener('change', function() {
                loadTransactions(1);
            });
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', function() {
                const customDateRange = document.getElementById('date-range-container');
                if (this.value === 'custom' && customDateRange) {
                    customDateRange.classList.remove('hidden');
                } else if (customDateRange) {
                    customDateRange.classList.add('hidden');
                    loadTransactions(1);
                }
            });
        }
        
        // Apply custom date range filter
        const applyDateBtn = document.getElementById('apply-date-filter');
        if (applyDateBtn) {
            applyDateBtn.addEventListener('click', function() {
                loadTransactions(1);
            });
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', function() {
                const body = document.body;
                if (body.getAttribute('data-theme') === 'dark') {
                    body.removeAttribute('data-theme');
                    localStorage.setItem('theme', 'light');
                    if (themeToggle.querySelector('i')) {
                        themeToggle.querySelector('i').classList.replace('fa-sun', 'fa-moon');
                    }
                } else {
                    body.setAttribute('data-theme', 'dark');
                    localStorage.setItem('theme', 'dark');
                    if (themeToggle.querySelector('i')) {
                        themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
                    }
                }
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
    }
    
    /**
     * Setup theme preference based on localStorage
     */
    function setupThemePreference() {
        const themeToggle = document.getElementById('theme-toggle');
        const body = document.body;
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            body.setAttribute('data-theme', 'dark');
            if (themeToggle) {
                const themeIcon = themeToggle.querySelector('i');
                if (themeIcon) {
                    themeIcon.classList.replace('fa-moon', 'fa-sun');
                } else {
                    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                }
            }
        }
    }
    
    /**
     * Show loader
     */
    function showLoader() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.remove('hidden');
        }
        
        // Hide the table and empty state
        const transactionsContainer = document.querySelector('.transactions-container');
        const emptyState = document.getElementById('empty-state');
        
        if (transactionsContainer) {
            transactionsContainer.classList.add('hidden');
        }
        
        if (emptyState) {
            emptyState.classList.add('hidden');
        }
    }
    
    /**
     * Hide loader
     */
    function hideLoader() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }
    
    /**
     * Load all budgets for the filter dropdown with caching
     */
    async function loadBudgetsForFilter() {
        try {
            const now = Date.now();
            
            // Check cache first
            if (dataCache.budgets && now - dataCache.lastFetched.budgets < dataCache.cacheDuration) {
                populateBudgetFilter(dataCache.budgets);
                return dataCache.budgets;
            }
            
            const response = await fetch('/api/budgets', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/';
                    return [];
                }
                throw new Error('Failed to load budgets');
            }
            
            const data = await response.json();
            const budgets = data.data || [];
            
            // Cache the budgets
            dataCache.budgets = budgets;
            dataCache.lastFetched.budgets = now;
            
            // Populate the budget filter dropdown
            populateBudgetFilter(budgets);
            
            return budgets;
        } catch (error) {
            console.error('Error loading budgets for filter:', error);
            showNotification('Error loading budgets', 'error');
            return [];
        }
    }
    
    /**
     * Populate the budget filter dropdown
     */
    function populateBudgetFilter(budgets) {
        const budgetFilter = document.getElementById('budget-filter');
        
        if (budgetFilter) {
            // Clear existing options (except the "All Budgets" option)
            const allOption = budgetFilter.querySelector('option[value="all"]');
            budgetFilter.innerHTML = '';
            budgetFilter.appendChild(allOption);
            
            // Add budget options
            budgets.forEach(budget => {
                const option = document.createElement('option');
                option.value = budget.budget_id || budget.id;
                option.textContent = budget.budget_name;
                budgetFilter.appendChild(option);
            });
        }
    }
    
    /**
     * Fetch transactions for a specific budget
     */
    async function fetchBudgetTransactions(budgetId, budgetName) {
        try {
            const response = await fetch(`/api/budgets/${budgetId}/transactions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch transactions for budget ${budgetId}`);
            }
            
            const data = await response.json();
            const transactions = data.data || [];
            
            // Add budget name to each transaction
            return transactions.map(transaction => ({
                ...transaction,
                budget_name: budgetName
            }));
        } catch (error) {
            console.error(`Error fetching transactions for budget ${budgetId}:`, error);
            return [];
        }
    }
    
    /**
     * Load transactions with optimized API calls
     */
    async function loadTransactions(page = 1) {
        showLoader();
        
        try {
            // Get filter values
            const searchQuery = document.getElementById('transaction-search')?.value || '';
            const budgetId = document.getElementById('budget-filter')?.value || 'all';
            const transactionType = document.getElementById('type-filter')?.value || 'all';
            const dateRange = document.getElementById('date-filter')?.value || 'all';
            
            // Handle custom date range
            let fromDate = null;
            let toDate = null;
            
            if (dateRange === 'custom') {
                fromDate = document.getElementById('date-from')?.value || '';
                toDate = document.getElementById('date-to')?.value || '';
            }
            
            // Load budgets if not in cache
            let budgets = dataCache.budgets;
            if (!budgets) {
                budgets = await loadBudgetsForFilter();
            }
            
            // Fetch transactions
            let allTransactions = [];
            
            if (budgetId === 'all') {
                // Skip the problematic /api/transactions endpoint and directly use the per-budget approach
                const fetchPromises = budgets.map(budget => {
                    const budgetId = budget.budget_id || budget.id;
                    return fetchBudgetTransactions(budgetId, budget.budget_name);
                });
                
                const results = await Promise.all(fetchPromises);
                allTransactions = results.flat();
            } else {
                // Fetch transactions for single budget
                const budget = budgets.find(b => (b.budget_id || b.id) == budgetId);
                allTransactions = await fetchBudgetTransactions(budgetId, budget ? budget.budget_name : 'Unknown Budget');
            }
            
            // Apply filters
            let filteredTransactions = allTransactions;
            
            // Search filter
            if (searchQuery) {
                filteredTransactions = filteredTransactions.filter(transaction => 
                    transaction.description?.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }
            
            // Transaction type filter
            if (transactionType !== 'all') {
                filteredTransactions = filteredTransactions.filter(transaction => {
                    const amount = parseFloat(transaction.amount);
                    if (transactionType === 'expense') {
                        return amount < 0;
                    } else if (transactionType === 'payment') {
                        return amount >= 0;
                    }
                    return true;
                });
            }
            
            // Date filter
            if (dateRange !== 'all') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const getDateOnly = (dateStr) => {
                    const date = new Date(dateStr);
                    date.setHours(0, 0, 0, 0);
                    return date;
                };
                
                filteredTransactions = filteredTransactions.filter(transaction => {
                    const transactionDate = getDateOnly(transaction.transaction_date);
                    
                    switch (dateRange) {
                        case 'today':
                            return transactionDate.getTime() === today.getTime();
                            
                        case 'this_week': {
                            const firstDay = new Date(today);
                            const day = today.getDay();
                            const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
                            firstDay.setDate(diff);
                            return transactionDate >= firstDay;
                        }
                        
                        case 'this_month': {
                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                            return transactionDate >= firstDay;
                        }
                        
                        case 'last_month': {
                            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                            return transactionDate >= firstDay && transactionDate <= lastDay;
                        }
                        
                        case 'custom':
                            let isInRange = true;
                            if (fromDate) {
                                const fromDateObj = getDateOnly(fromDate);
                                isInRange = isInRange && transactionDate >= fromDateObj;
                            }
                            if (toDate) {
                                const toDateObj = getDateOnly(toDate);
                                isInRange = isInRange && transactionDate <= toDateObj;
                            }
                            return isInRange;
                            
                        default:
                            return true;
                    }
                });
            }
            
            // Update summary statistics
            updateSummaryStatistics(filteredTransactions);
            
            // Sort by date (newest first)
            filteredTransactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
            
            // Pagination
            const itemsPerPage = 10;
            const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
            
            // Ensure page is within bounds
            if (page < 1) page = 1;
            if (page > totalPages && totalPages > 0) page = totalPages;
            
            // Calculate slice indices
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, filteredTransactions.length);
            
            // Get current page items
            const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
            
            // Display the transactions
            renderTransactions(paginatedTransactions, filteredTransactions.length === 0);
            
            // Create pagination controls
            createPagination(page, totalPages, filteredTransactions.length);
            
            // Cache the transactions for future use
            dataCache.transactions = allTransactions;
            dataCache.lastFetched.transactions = Date.now();
            
        } catch (error) {
            // Only show notification for truly unexpected errors
            showNotification('Error loading transactions. Please try again.', 'error');
            
            // Show empty state
            const transactionsContainer = document.querySelector('.transactions-container');
            const emptyState = document.getElementById('empty-state');
            
            if (transactionsContainer) {
                transactionsContainer.classList.add('hidden');
            }
            
            if (emptyState) {
                emptyState.classList.remove('hidden');
                const emptyStateTitle = emptyState.querySelector('h3');
                const emptyStateMessage = emptyState.querySelector('p');
                
                if (emptyStateTitle) emptyStateTitle.textContent = 'Error Loading Transactions';
                if (emptyStateMessage) emptyStateMessage.textContent = 'An error occurred while loading transactions. Please try again.';
            }
        } finally {
            hideLoader();
        }
    }
    
    /**
     * Update summary statistics based on filtered transactions
     */
    function updateSummaryStatistics(transactions) {
        const totalTransactionsCount = document.getElementById('total-transactions-count');
        const totalExpenses = document.getElementById('total-expenses');
        const totalPayments = document.getElementById('total-payments');
        
        if (totalTransactionsCount) {
            totalTransactionsCount.textContent = transactions.length;
        }
        
        // Calculate expenses and payments
        let expenseSum = 0;
        let paymentSum = 0;
        
        transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount) || 0;
            if (amount < 0) {
                expenseSum += Math.abs(amount);
            } else {
                paymentSum += amount;
            }
        });
        
        if (totalExpenses) {
            totalExpenses.textContent = `₱${expenseSum.toFixed(2)}`;
        }
        
        if (totalPayments) {
            totalPayments.textContent = `₱${paymentSum.toFixed(2)}`;
        }
    }
    
    /**
     * Render transactions to the UI
     */
    function renderTransactions(transactions, isEmpty) {
        const transactionsList = document.getElementById('transactions-list');
        const transactionsContainer = document.querySelector('.transactions-container');
        const emptyState = document.getElementById('empty-state');
        
        if (!transactionsList || !transactionsContainer || !emptyState) return;
        
        // Show appropriate container based on whether we have transactions
        if (isEmpty) {
            transactionsContainer.classList.add('hidden');
            emptyState.classList.remove('hidden');
            
            // Update empty state message
            const emptyStateTitle = emptyState.querySelector('h3');
            const emptyStateMessage = emptyState.querySelector('p');
            
            if (emptyStateTitle) emptyStateTitle.textContent = 'No Transactions Found';
            if (emptyStateMessage) emptyStateMessage.textContent = 'No transactions match your current filters.';
            
            return;
        }
        
        // Show transactions table
        transactionsContainer.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        // Clear existing transactions
        transactionsList.innerHTML = '';
        
        // Add transactions to the table
        transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount);
            const isExpense = amount < 0;
            const formattedAmount = `₱${Math.abs(amount).toFixed(2)}`;
            const amountClass = isExpense ? 'amount-negative' : 'amount-positive';
            const type = isExpense ? 'Expense' : 'Payment';
            
            // Format date
            const date = new Date(transaction.transaction_date).toLocaleDateString();
            
            // Create table row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${date}</td>
                <td>${transaction.description || 'No description'}</td>
                <td>${transaction.budget_name || 'Unknown Budget'}</td>
                <td class="${amountClass}">${isExpense ? '-' : '+'}${formattedAmount}</td>
                <td>${type}</td>
            `;
            
            transactionsList.appendChild(row);
        });
    }
    
    /**
     * Create pagination controls
     */
    function createPagination(currentPage, totalPages, totalItems) {
        const paginationContainer = document.getElementById('pagination-controls');
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        // Only show pagination if there's more than one page
        if (totalPages <= 1) return;
        
        // Page info
        const pageInfoEl = document.createElement('span');
        pageInfoEl.className = 'pagination-info';
        pageInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
        paginationContainer.appendChild(pageInfoEl);
        
        // Previous button
        if (currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'pagination-btn';
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.addEventListener('click', () => loadTransactions(currentPage - 1));
            paginationContainer.appendChild(prevBtn);
        }
        
        // Page buttons
        let startPage = Math.max(1, currentPage - 1);
        let endPage = Math.min(totalPages, currentPage + 1);
        
        // Adjust if we're at start/end
        if (currentPage === 1) {
            endPage = Math.min(3, totalPages);
        } else if (currentPage === totalPages) {
            startPage = Math.max(1, totalPages - 2);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => loadTransactions(i));
            paginationContainer.appendChild(pageBtn);
        }
        
        // Next button
        if (currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'pagination-btn';
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.addEventListener('click', () => loadTransactions(currentPage + 1));
            paginationContainer.appendChild(nextBtn);
        }
    }
    
    /**
     * Show notification
     */
    function showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.custom-notification');
        existingNotifications.forEach(notification => notification.remove());
        
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
});