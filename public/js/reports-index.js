document.addEventListener('DOMContentLoaded', function() {
    // Check for authentication
    const authToken = localStorage.getItem('token');
    if (!authToken) {
        window.location.href = '/';
        return;
    }
    
    // Chart instances
    let incomeExpenseChart = null;
    let expenseCategoryChart = null;
    let monthlyTrendChart = null;
    let topExpensesChart = null;
    
    // Data cache
    const dataCache = {
        budgets: null,
        transactions: null,
        lastFetched: {
            budgets: 0,
            transactions: 0
        },
        // Cache lifetime in milliseconds (5 minutes)
        cacheDuration: 5 * 60 * 1000
    };
    
    // Chart colors for dark and light themes
    const chartColors = {
        light: {
            expense: 'rgba(231, 76, 60, 0.7)',
            expenseBorder: 'rgba(231, 76, 60, 1)',
            income: 'rgba(46, 204, 113, 0.7)',
            incomeBorder: 'rgba(46, 204, 113, 1)',
            grid: '#e0e0e0',
            text: '#333333',
            palette: [
                'rgba(52, 152, 219, 0.7)',
                'rgba(155, 89, 182, 0.7)',
                'rgba(52, 73, 94, 0.7)',
                'rgba(230, 126, 34, 0.7)',
                'rgba(241, 196, 15, 0.7)',
                'rgba(26, 188, 156, 0.7)',
                'rgba(231, 76, 60, 0.7)',
                'rgba(149, 165, 166, 0.7)'
            ]
        },
        dark: {
            expense: 'rgba(252, 129, 129, 0.7)',
            expenseBorder: 'rgba(252, 129, 129, 1)',
            income: 'rgba(104, 211, 145, 0.7)',
            incomeBorder: 'rgba(104, 211, 145, 1)',
            grid: '#4a5568',
            text: '#e2e8f0',
            palette: [
                'rgba(66, 153, 225, 0.7)',
                'rgba(183, 148, 244, 0.7)',
                'rgba(160, 174, 192, 0.7)',
                'rgba(246, 173, 85, 0.7)',
                'rgba(246, 224, 94, 0.7)',
                'rgba(72, 187, 120, 0.7)',
                'rgba(252, 129, 129, 0.7)',
                'rgba(113, 128, 150, 0.7)'
            ]
        }
    };
    
    // Initialize reports page
    initializeReportsPage();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup theme preference
    setupThemePreference();
    
    /**
     * Initialize the reports page
     */
    async function initializeReportsPage() {
        showLoader();
        
        try {
            // Load budgets and transactions in parallel for better performance
            await Promise.all([
                loadBudgetsForFilter(),
                loadReportData()
            ]);
            
            // Setup Excel export buttons after data is loaded
            setupExcelExport();
        } catch (error) {
            showNotification('Error loading report data. Please try again.', 'error');
            showEmptyState();
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
        
        // Date range filter
        const dateRangeSelect = document.getElementById('date-range');
        const customDateRange = document.getElementById('custom-date-range');
        
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', function() {
                if (this.value === 'custom') {
                    customDateRange.style.display = 'flex';
                } else {
                    customDateRange.style.display = 'none';
                    loadReportData();
                }
            });
        }
        
        // Apply custom date filter
        const applyDateBtn = document.getElementById('apply-date-filter');
        if (applyDateBtn) {
            applyDateBtn.addEventListener('click', function() {
                loadReportData();
            });
        }
        
        // Budget filter
        const budgetFilter = document.getElementById('budget-filter');
        if (budgetFilter) {
            budgetFilter.addEventListener('change', function() {
                loadReportData();
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
                    
                    // Update charts with light theme
                    updateChartsTheme('light');
                } else {
                    body.setAttribute('data-theme', 'dark');
                    localStorage.setItem('theme', 'dark');
                    if (themeToggle.querySelector('i')) {
                        themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
                    }
                    
                    // Update charts with dark theme
                    updateChartsTheme('dark');
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
        
        // Setup chart download buttons
        setupDownloadButtons();
    }
    
    /**
     * Setup download buttons for charts
     */
    function setupDownloadButtons() {
        // Income vs Expense chart download
        const downloadIncomeExpense = document.getElementById('download-income-expense');
        if (downloadIncomeExpense) {
            downloadIncomeExpense.addEventListener('click', function() {
                downloadChart('income-expense-chart', 'expenses-vs-income.png');
            });
        }
        
        // Expense category chart download
        const downloadExpenseCategory = document.getElementById('download-expense-category');
        if (downloadExpenseCategory) {
            downloadExpenseCategory.addEventListener('click', function() {
                downloadChart('expense-category-chart', 'expenses-by-budget.png');
            });
        }
        
        // Monthly trend chart download
        const downloadMonthlyTrend = document.getElementById('download-monthly-trend');
        if (downloadMonthlyTrend) {
            downloadMonthlyTrend.addEventListener('click', function() {
                downloadChart('monthly-trend-chart', 'monthly-trends.png');
            });
        }
        
        // Top expenses chart download
        const downloadTopExpenses = document.getElementById('download-top-expenses');
        if (downloadTopExpenses) {
            downloadTopExpenses.addEventListener('click', function() {
                downloadChart('top-expenses-chart', 'top-expenses.png');
            });
        }
    }
    
    /**
     * Download chart as PNG
     */
    function downloadChart(chartId, filename) {
        const canvas = document.getElementById(chartId);
        if (!canvas) return;
        
        // Create a temporary link
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    /**
     * Setup theme preference based on localStorage
     */
    function setupThemePreference() {
        const themeToggle = document.getElementById('theme-toggle');
        const body = document.body;
        const savedTheme = localStorage.getItem('theme');
        
        let currentTheme = 'light';
        
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            body.setAttribute('data-theme', 'dark');
            currentTheme = 'dark';
            
            if (themeToggle) {
                const themeIcon = themeToggle.querySelector('i');
                if (themeIcon) {
                    themeIcon.classList.replace('fa-moon', 'fa-sun');
                } else {
                    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                }
            }
        }
        
        // Set default chart theme based on current theme
        Chart.defaults.color = chartColors[currentTheme].text;
        Chart.defaults.borderColor = chartColors[currentTheme].grid;
        Chart.defaults.backgroundColor = chartColors[currentTheme].palette[0];
    }
    
    /**
     * Update charts theme when theme changes
     */
    function updateChartsTheme(theme) {
        // Update Chart.js defaults
        Chart.defaults.color = chartColors[theme].text;
        Chart.defaults.borderColor = chartColors[theme].grid;
        
        // Update and redraw all charts
        if (incomeExpenseChart) {
            incomeExpenseChart.data.datasets[0].backgroundColor = chartColors[theme].expense;
            incomeExpenseChart.data.datasets[0].borderColor = chartColors[theme].expenseBorder;
            incomeExpenseChart.data.datasets[1].backgroundColor = chartColors[theme].income;
            incomeExpenseChart.data.datasets[1].borderColor = chartColors[theme].incomeBorder;
            incomeExpenseChart.update();
        }
        
        if (expenseCategoryChart) {
            expenseCategoryChart.data.datasets[0].backgroundColor = chartColors[theme].palette;
            expenseCategoryChart.update();
        }
        
        if (monthlyTrendChart) {
            monthlyTrendChart.data.datasets[0].backgroundColor = chartColors[theme].expense;
            monthlyTrendChart.data.datasets[0].borderColor = chartColors[theme].expenseBorder;
            monthlyTrendChart.data.datasets[1].backgroundColor = chartColors[theme].income;
            monthlyTrendChart.data.datasets[1].borderColor = chartColors[theme].incomeBorder;
            monthlyTrendChart.update();
        }
        
        if (topExpensesChart) {
            topExpensesChart.data.datasets[0].backgroundColor = chartColors[theme].palette;
            topExpensesChart.update();
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
        
        // Hide empty state
        const emptyState = document.getElementById('empty-state');
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
     * Show empty state when no data is available
     */
    function showEmptyState() {
        // Hide charts container
        const chartsContainers = document.querySelectorAll('.charts-container');
        chartsContainers.forEach(container => {
            container.style.display = 'none';
        });
        
        // Hide summary cards
        const summaryCards = document.querySelector('.summary-cards');
        if (summaryCards) {
            summaryCards.style.display = 'none';
        }
        
        // Show empty state
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }
    }
    
    /**
     * Hide empty state
     */
    function hideEmptyState() {
        // Show charts container
        const chartsContainers = document.querySelectorAll('.charts-container');
        chartsContainers.forEach(container => {
            container.style.display = 'grid';
        });
        
        // Show summary cards
        const summaryCards = document.querySelector('.summary-cards');
        if (summaryCards) {
            summaryCards.style.display = 'grid';
        }
        
        // Hide empty state
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.classList.add('hidden');
        }
    }
    
    /**
     * Load budgets for filter dropdown
     */
    async function loadBudgetsForFilter() {
        try {
            // Check if we have cached data that's still valid
            const now = Date.now();
            if (dataCache.budgets && (now - dataCache.lastFetched.budgets < dataCache.cacheDuration)) {
                populateBudgetFilter(dataCache.budgets);
                return;
            }
            
            const response = await fetch('/api/budgets', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load budgets');
            }
            
            const data = await response.json();
            
            // Cache the data
            dataCache.budgets = data.data;
            dataCache.lastFetched.budgets = now;
            
            populateBudgetFilter(data.data);
        } catch (error) {
            showNotification('Error loading budgets for filter', 'error');
        }
    }
    
    /**
     * Populate budget filter dropdown
     */
    function populateBudgetFilter(budgets) {
        const budgetFilter = document.getElementById('budget-filter');
        if (!budgetFilter) return;
        
        
        // Clear existing options except "All Budgets"
        while (budgetFilter.options.length > 1) {
            budgetFilter.remove(1);
        }
        
        // Add budget options
        budgets.forEach(budget => {
            const option = document.createElement('option');
            // Use either budget_id or id, whichever is available
            option.value = budget.budget_id || budget.id;
            // Use either budget_name or name, whichever is available
            option.textContent = budget.budget_name || budget.name;
            budgetFilter.appendChild(option);
        });
    }
    
    /**
     * Load report data based on filters
     */
    async function loadReportData() {
        showLoader();
        
        try {
            // Get filter values
            const dateRange = document.getElementById('date-range').value;
            const budgetId = document.getElementById('budget-filter').value;
            
            // Build query parameters
            let queryParams = new URLSearchParams();
            
            // Add date range parameters
            if (dateRange === 'custom') {
                const startDate = document.getElementById('start-date').value;
                const endDate = document.getElementById('end-date').value;
                
                if (!startDate || !endDate) {
                    showNotification('Please select both start and end dates', 'error');
                    hideLoader();
                    return;
                }
                
                queryParams.append('start_date', startDate);
                queryParams.append('end_date', endDate);
            } else {
                queryParams.append('date_range', dateRange);
            }
            
            // Add budget filter if not "all"
            if (budgetId !== 'all') {
                queryParams.append('budget_id', budgetId);
            }
            
            // Make API request for transaction data
            const response = await fetch(`/api/reports/transactions?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load report data');
            }
            
            const data = await response.json();
            
            // Cache the data
            dataCache.transactions = data.data;
            dataCache.lastFetched.transactions = Date.now();
            
            // Process and display the data
            processReportData(data.data);
        } catch (error) {
            showNotification('Error loading report data', 'error');
            showEmptyState();
        } finally {
            hideLoader();
        }
    }
    
    /**
     * Process and display report data
     */
    function processReportData(data) {
        if (!data || data.length === 0) {
            showEmptyState();
            return;
        }
        
        hideEmptyState();
        
        // Calculate summary metrics
        const summary = calculateSummary(data);
        
        // Update summary cards
        updateSummaryCards(summary);
        
        // Create charts
        createIncomeExpenseChart(data);
        createExpenseCategoryChart(data);
        createMonthlyTrendChart(data);
        createTopExpensesChart(data);
    }
    
    /**
     * Calculate summary metrics from transaction data
     */
    function calculateSummary(transactions) {
        let totalExpenses = 0;
        let totalIncome = 0;
        let transactionCount = transactions.length;

        
        transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount);
            
            // Check if amount is negative or transaction type is expense/payment
            if (amount < 0 || transaction.type === 'expense' || transaction.type === 'payment') {
                // Always use positive value for expenses in the summary
                totalExpenses += Math.abs(amount);
            } else if (amount > 0 || transaction.type === 'income' || transaction.type === 'deposit') {
                totalIncome += Math.abs(amount);
            }
        });
        
        const netBalance = totalIncome - totalExpenses;
        
        
        return {
            totalExpenses,
            totalIncome,
            netBalance,
            transactionCount
        };
    }
    
    /**
     * Update summary cards with calculated metrics
     */
    function updateSummaryCards(summary) {
        // Format numbers as PHP currency
        const formatter = new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        });
        
        // Update total expenses
        const totalExpensesElement = document.getElementById('total-expenses');
        if (totalExpensesElement) {
            totalExpensesElement.textContent = formatter.format(summary.totalExpenses);
        }
        
        // Update total income
        const totalIncomeElement = document.getElementById('total-income');
        if (totalIncomeElement) {
            totalIncomeElement.textContent = formatter.format(summary.totalIncome);
        }
        
        // Update net balance
        const netBalanceElement = document.getElementById('net-balance');
        if (netBalanceElement) {
            netBalanceElement.textContent = formatter.format(summary.netBalance);
            // Add color based on positive/negative balance
            if (summary.netBalance < 0) {
                netBalanceElement.classList.add('text-danger');
                netBalanceElement.classList.remove('text-success');
            } else {
                netBalanceElement.classList.add('text-success');
                netBalanceElement.classList.remove('text-danger');
            }
        }
        
        // Update transaction count
        const transactionCountElement = document.getElementById('transaction-count');
        if (transactionCountElement) {
            transactionCountElement.textContent = summary.transactionCount;
        }
    }
    
    /**
     * Create income vs expense bar chart
     */
    function createIncomeExpenseChart(transactions) {
        const ctx = document.getElementById('income-expense-chart');
        if (!ctx) return;
        
        // Group data by month
        const monthlyData = groupTransactionsByMonth(transactions);
        const months = Object.keys(monthlyData);
        
        // Extract expenses and income for each month
        const expensesData = months.map(month => monthlyData[month].expense);
        const incomeData = months.map(month => monthlyData[month].income);
        
        // Get current theme
        const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        
        // Create or update chart
        if (incomeExpenseChart) {
            incomeExpenseChart.data.labels = months;
            incomeExpenseChart.data.datasets[0].data = expensesData;
            incomeExpenseChart.data.datasets[1].data = incomeData;
            incomeExpenseChart.update();
        } else {
            incomeExpenseChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Expenses',
                            data: expensesData,
                            backgroundColor: chartColors[currentTheme].expense,
                            borderColor: chartColors[currentTheme].expenseBorder,
                            borderWidth: 1
                        },
                        {
                            label: 'Income',
                            data: incomeData,
                            backgroundColor: chartColors[currentTheme].income,
                            borderColor: chartColors[currentTheme].incomeBorder,
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₱' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += '₱' + context.parsed.y.toLocaleString();
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Create expense category pie chart
     */
    function createExpenseCategoryChart(transactions) {
        const ctx = document.getElementById('expense-category-chart');
        if (!ctx) return;
        
        
        // Filter only expense transactions
        const expenseTransactions = transactions.filter(t => 
            t.amount < 0 || t.type === 'expense' || t.type === 'payment'
        );
        
        
        // Group expenses by budget
        const expensesByBudget = {};
        
        expenseTransactions.forEach(transaction => {
            // Get budget name, accounting for different possible property names
            let budgetName = 'Uncategorized';
            if (transaction.budget) {
                budgetName = transaction.budget.budget_name || transaction.budget.name || 'Uncategorized';
            }
            
            if (!expensesByBudget[budgetName]) {
                expensesByBudget[budgetName] = 0;
            }
            
            expensesByBudget[budgetName] += Math.abs(parseFloat(transaction.amount));
        });

        
        // Prepare data for chart
        const budgetNames = Object.keys(expensesByBudget);
        const expenseValues = Object.values(expensesByBudget);
        
        // Only create chart if there's data
        if (budgetNames.length === 0) {
            ctx.parentNode.innerHTML = '<div class="empty-chart-message">No expense data available for budgets</div>';
            return;
        }
        
        // Get current theme
        const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        
        // Create or update chart
        if (expenseCategoryChart) {
            expenseCategoryChart.data.labels = budgetNames;
            expenseCategoryChart.data.datasets[0].data = expenseValues;
            expenseCategoryChart.update();
        } else {
            expenseCategoryChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: budgetNames,
                    datasets: [{
                        data: expenseValues,
                        backgroundColor: chartColors[currentTheme].palette
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value * 100) / total) + '%';
                                    return `${context.label}: ₱${value.toLocaleString()} (${percentage})`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Create monthly trend line chart
     */
    function createMonthlyTrendChart(transactions) {
        const ctx = document.getElementById('monthly-trend-chart');
        if (!ctx) return;
        
        // Group data by month
        const monthlyData = groupTransactionsByMonth(transactions);
        const months = Object.keys(monthlyData);
        
        // Extract expenses and income for each month
        const expensesData = months.map(month => monthlyData[month].expense);
        const incomeData = months.map(month => monthlyData[month].income);
        
        // Get current theme
        const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        
        // Create or update chart
        if (monthlyTrendChart) {
            monthlyTrendChart.data.labels = months;
            monthlyTrendChart.data.datasets[0].data = expensesData;
            monthlyTrendChart.data.datasets[1].data = incomeData;
            monthlyTrendChart.update();
        } else {
            monthlyTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Expenses',
                            data: expensesData,
                            borderColor: chartColors[currentTheme].expenseBorder,
                            backgroundColor: chartColors[currentTheme].expense,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Income',
                            data: incomeData,
                            borderColor: chartColors[currentTheme].incomeBorder,
                            backgroundColor: chartColors[currentTheme].income,
                            tension: 0.3,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₱' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += '₱' + context.parsed.y.toLocaleString();
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Create top expenses chart
     */
    function createTopExpensesChart(transactions) {
        const ctx = document.getElementById('top-expenses-chart');
        if (!ctx) return;
        
        
        // Filter expense transactions and sort by amount
        const expenseTransactions = transactions
            .filter(t => {
                // Include transactions that are expenses either by type or by negative amount
                return (t.type === 'expense' || t.type === 'payment' || parseFloat(t.amount) < 0);
            })
            .map(t => ({
                ...t,
                amount: Math.abs(parseFloat(t.amount)) // Convert to absolute value for sorting
            }))
            .sort((a, b) => b.amount - a.amount) // Sort by amount (highest first)
            .slice(0, 10); // Get top 10 expenses
        
        
        if (expenseTransactions.length === 0) {
            ctx.parentNode.innerHTML = '<div class="empty-chart-message">No expense data available</div>';
            return;
        }
        
        // Prepare data for chart
        const labels = expenseTransactions.map(t => truncateText(t.description || 'Unnamed Transaction', 20));
        const data = expenseTransactions.map(t => t.amount); // Use absolute values
        
        // Get current theme
        const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        
        // Create or update chart
        if (topExpensesChart) {
            topExpensesChart.data.labels = labels;
            topExpensesChart.data.datasets[0].data = data;
            topExpensesChart.update();
        } else {
            topExpensesChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Amount',
                        data: data,
                        backgroundColor: chartColors[currentTheme].palette
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₱' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const transaction = expenseTransactions[context.dataIndex];
                                    return [
                                        `Amount: ₱${transaction.amount.toLocaleString()}`,
                                        `Date: ${formatDate(transaction.transaction_date || transaction.date || transaction.created_at || '')}`,
                                        `Budget: ${transaction.budget?.budget_name || transaction.budget?.name || 'Uncategorized'}`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Group transactions by month
     */
    function groupTransactionsByMonth(transactions) {
        const monthlyData = {};
        
        
        transactions.forEach(transaction => {
            // Check if the date is valid before processing
            let dateStr = null;
            
            // Try different date properties that might be available
            if (transaction.transaction_date) {
                dateStr = transaction.transaction_date;
            } else if (transaction.date) {
                dateStr = transaction.date;
            } else if (transaction.created_at) {
                dateStr = transaction.created_at;
            }
            
            if (!dateStr) {
                return; // Skip this transaction
            }
            
            try {
                const date = new Date(dateStr);
                
                // Check if date is valid
                if (isNaN(date.getTime())) {
                    return; // Skip this transaction
                }
                
                const month = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
                
                if (!monthlyData[month]) {
                    monthlyData[month] = {
                        expense: 0,
                        income: 0
                    };
                }
                
                const amount = parseFloat(transaction.amount);
                
                // Make sure we're handling the transaction type correctly
                if (amount < 0 || transaction.type === 'expense' || transaction.type === 'payment') {
                    monthlyData[month].expense += Math.abs(amount);
                } else {
                    monthlyData[month].income += Math.abs(amount);
                }
            } catch (error) {
            }
        });
        
        // Log the monthly data
        
        // Sort months chronologically
        const sortedMonthlyData = {};
        Object.keys(monthlyData)
            .sort((a, b) => {
                const dateA = new Date(a);
                const dateB = new Date(b);
                return dateA - dateB;
            })
            .forEach(month => {
                sortedMonthlyData[month] = monthlyData[month];
            });
        
        return sortedMonthlyData;
    }
    
    /**
     * Format date to readable format
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    /**
     * Truncate text to a certain length
     */
    function truncateText(text, maxLength) {
        if (!text) return 'Unnamed';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    /**
     * Show notification to user
     */
    function showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.custom-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        
        // Create notification content
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        // Add icon based on notification type
        const icon = document.createElement('i');
        icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        content.appendChild(icon);
        
        // Add message text
        const messageText = document.createElement('span');
        messageText.textContent = message;
        content.appendChild(messageText);
        
        notification.appendChild(content);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        notification.appendChild(closeButton);
        
        // Add to document
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    /**
     * Setup Excel export functionality
     */
    function setupExcelExport() {
        const exportButton = document.getElementById('export-excel');
        if (exportButton) {
            exportButton.addEventListener('click', function() {
                exportReportToExcel();
            });
        }
    }

    /**
     * Export report data to Excel
     */
    function exportReportToExcel() {
        try {
            if (!dataCache.transactions || dataCache.transactions.length === 0) {
                showNotification('No data available to export', 'error');
                return;
            }

            // Create a new workbook
            const wb = XLSX.utils.book_new();
            
            // Format the data for Excel
            const formattedData = dataCache.transactions.map(transaction => {
                return {
                    'Date': formatDate(transaction.date || transaction.transaction_date || ''),
                    'Description': transaction.description || '',
                    'Type': transaction.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : '',
                    'Amount': parseFloat(transaction.amount || 0).toFixed(2),
                    // Fix budget name access
                    'Budget': transaction.budget?.budget_name || 'Uncategorized',
                    'Status': transaction.status || ''
                };
            });
            
            // Create a worksheet
            const ws = XLSX.utils.json_to_sheet(formattedData);
            
            // Add the worksheet to the workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
            
            // Generate Excel file and trigger download
            XLSX.writeFile(wb, 'budget_transactions_report.xlsx');
            
            showNotification('Report exported successfully', 'success');
        } catch (error) {
            showNotification('Failed to export report. Make sure SheetJS is properly loaded.', 'error');
        }
    }
});