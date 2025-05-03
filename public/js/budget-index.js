document.addEventListener('DOMContentLoaded', function() {
    // Check for authentication
    const authToken = localStorage.getItem('token');
    if (!authToken) {
        window.location.href = '/';
        return;
    }
    
    // Initialize page
    initializeBudgetsPage();
    
    // Event listeners
    setupEventListeners();
});

async function initializeBudgetsPage() {
    // Load budgets
    await loadBudgets();
}

function setupEventListeners() {
    // Theme toggle - FIX THE THEME INITIALIZATION
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check for saved theme preference first
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    
    // Apply the saved theme or use system preference
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        body.setAttribute('data-theme', 'dark');
        if (themeToggle.querySelector('i')) {
            themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        } else {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    // Add click event for theme toggle
    themeToggle.addEventListener('click', function() {
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (themeToggle.querySelector('i')) {
                themeToggle.querySelector('i').classList.replace('fa-sun', 'fa-moon');
            } else {
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
        } else {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (themeToggle.querySelector('i')) {
                themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
            } else {
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }
    });
    
    // Sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    sidebarToggle.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    // Search functionality
    const searchInput = document.getElementById('budget-search');
    const searchBtn = document.getElementById('search-btn');
    
    // Add debounce function to improve search performance
    const debounce = (func, delay) => {
        let debounceTimer;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    };
    
    // Search on button click
    searchBtn.addEventListener('click', function() {
        loadBudgets(1); // Reset to first page on new search
    });
    
    // Debounced search on input (for faster response)
    searchInput.addEventListener('input', debounce(function() {
        loadBudgets(1); // Reset to first page on new search
    }, 300));
    
    // Clear search box button functionality (X button)
    searchInput.addEventListener('search', function() {
        // This event fires when the "x" is clicked or when search is cleared
        loadBudgets(1); // Reset to first page
    });
    
    // Also keep Enter key functionality
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            loadBudgets(1); // Reset to first page on new search
        }
    });
    
    // Filter change events - trigger loading immediately when changed
    document.getElementById('payment-status-filter').addEventListener('change', function() {
        loadBudgets(1); // Reset to first page on filter change
    });
    
    document.getElementById('sort-by').addEventListener('change', function() {
        loadBudgets(1); // Reset to first page on sort change
    });
    
    // Logout functionality
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/';
    });
    
    // Add budget modal
    setupAddBudgetModal();
}

function setupAddBudgetModal() {
    const addBudgetBtn = document.getElementById('add-budget-btn');
    const modal = document.getElementById('add-budget-modal');
    const closeBtn = modal.querySelector('.close-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const form = document.getElementById('add-budget-form');
    
    // Set today's date as the default for all date fields
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('payment_due_date').value = today;
    document.getElementById('billing_cycle_start').value = today;
    
    // Set default billing cycle end (3 months from today)
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    document.getElementById('billing_cycle_end').value = threeMonthsLater.toISOString().split('T')[0];
    
    // Open modal
    addBudgetBtn.addEventListener('click', function() {
        modal.style.display = 'flex';
    });
    
    // Close modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    cancelBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
        
    // Close when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
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
        
        const formData = {
            budget_name: document.getElementById('budget_name').value,
            payment_due_date: document.getElementById('payment_due_date').value,
            billing_cycle_start: document.getElementById('billing_cycle_start').value,
            billing_cycle_end: document.getElementById('billing_cycle_end').value,
            total_limit: parseFloat(document.getElementById('total_limit').value),
            current_balance: 0,
            payment_status: 'paid'
        };
        
        try {
            const response = await fetch('/api/budgets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create budget');
            }
            
            // Close modal and reset form
            modal.style.display = 'none';
            form.reset();
            
            // Reload budgets
            await loadBudgets();
            
            // Show success message
            showNotification('Budget created successfully!', 'success');
        } catch (error) {
            console.error('Error creating budget:', error);
            showNotification(error.message || 'Failed to create budget', 'error');
        } finally {
            // Remove loader
            document.body.removeChild(loader);
        }
    });
}

// Custom notification function
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

async function loadBudgets(page = 1) {
    const container = document.getElementById('budget-cards-container');
    container.innerHTML = `
        <div class="loading-indicator">
            <i class="fas fa-spinner fa-spin"></i> Loading budgets...
        </div>
    `;
    
    // Get filter values
    const searchQuery = document.getElementById('budget-search').value.trim();
    const paymentStatus = document.getElementById('payment-status-filter').value;
    const sortBy = document.getElementById('sort-by').value;
    
    const itemsPerPage = 8; // Fixed at exactly 8 items per page
    
    try {
        // Fetch all budgets first
        const response = await fetch('/api/budgets', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized, redirect to login
                localStorage.removeItem('token');
                window.location.href = '/';
                return;
            }
            throw new Error('Failed to load budgets');
        }
        
        const data = await response.json();
        let budgets = data.data;
        
        // Apply client-side filtering and sorting
        
        // 1. Filter by search query (first letter matching)
        if (searchQuery && searchQuery.length > 0) {
            budgets = budgets.filter(budget => 
                budget.budget_name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        // 2. Filter by payment status
        if (paymentStatus !== 'all') {
            budgets = budgets.filter(budget => 
                budget.payment_status === paymentStatus
            );
        }
        
        // 3. Apply sorting
        if (sortBy) {
            switch(sortBy) {
                case 'newest':
                    budgets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
                case 'oldest':
                    budgets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    break;
                case 'name_asc':
                    budgets.sort((a, b) => a.budget_name.localeCompare(b.budget_name));
                    break;
                case 'name_desc':
                    budgets.sort((a, b) => b.budget_name.localeCompare(a.budget_name));
                    break;
                case 'balance_high':
                    budgets.sort((a, b) => parseFloat(b.current_balance) - parseFloat(a.current_balance));
                    break;
                case 'balance_low':
                    budgets.sort((a, b) => parseFloat(a.current_balance) - parseFloat(b.current_balance));
                    break;
            }
        }
        
        // Clear loading indicator
        container.innerHTML = '';
        
        if (!budgets || budgets.length === 0) {
            // Check if this is due to filtering or if there are no budgets at all
            const isFiltered = searchQuery || paymentStatus !== 'all' || sortBy !== 'newest';
            
            if (isFiltered) {
                // No matching budgets found after filtering
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>No Budgets Found</h3>
                        <p>No budgets match your search criteria</p>
                    </div>
                `;
            } else {
                // No budgets exist yet
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-credit-card"></i>
                        <h3>No Budgets Found</h3>
                        <p>Get started by creating your first budget</p>
                    </div>
                `;
            }
            
            return;
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(budgets.length / itemsPerPage);
        
        // Ensure page is within bounds
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        
        // Calculate slice indices
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, budgets.length);
        
        // Get current page items (exactly 8 per page)
        const paginatedBudgets = budgets.slice(startIndex, endIndex);
        
        // Create budget cards
        paginatedBudgets.forEach(budget => {
            const card = createBudgetCard(budget);
            container.appendChild(card);
        });
        
        // Create pagination - pass totalItems for display info
        createPagination(page, totalPages, budgets.length);
        
    } catch (error) {
        console.error('Error loading budgets:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Budgets</h3>
                <p>${error.message || 'Please try again later'}</p>
                <button class="btn-primary" id="retry-load-btn">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
        
        // Add event listener to retry button
        document.getElementById('retry-load-btn').addEventListener('click', function() {
            loadBudgets(page);
        });
    }
}

function createBudgetCard(budget) {
    // Create card element
    const card = document.createElement('div');
    card.className = 'budget-card';
    
    // Calculate progress percentage
    const totalLimit = parseFloat(budget.total_limit) || 0;
    const currentBalance = parseFloat(budget.current_balance) || 0;
    const progressPercentage = totalLimit > 0 ? (currentBalance / totalLimit) * 100 : 0;
    
    // Format dates
    const dueDate = budget.payment_due_date ? new Date(budget.payment_due_date).toLocaleDateString() : 'Not set';
    const createdDate = new Date(budget.created_at).toLocaleDateString();
    
    // Build card HTML
    card.innerHTML = `
        <div class="budget-card-header">
            <h3>${budget.budget_name}</h3>
            <span class="payment-status status-${budget.payment_status}">${budget.payment_status.toUpperCase()}</span>
        </div>
        <div class="budget-card-body">
            <div class="budget-info">
                <div class="budget-info-item">
                    <span class="info-label">Total Limit</span>
                    <span class="info-value">₱${totalLimit.toFixed(2)}</span>
                </div>
                <div class="budget-info-item">
                    <span class="info-label">Current Balance</span>
                    <span class="info-value">₱${currentBalance.toFixed(2)}</span>
                </div>
                <div class="budget-info-item">
                    <span class="info-label">Available Credit</span>
                    <span class="info-value">₱${(totalLimit - currentBalance).toFixed(2)}</span>
                </div>
                <div class="budget-info-item">
                    <span class="info-label">Due Date</span>
                    <span class="info-value">${dueDate}</span>
                </div>
            </div>
            
            <div class="budget-progress-bar">
                <div class="progress-fill" style="width: ${progressPercentage}%"></div>
            </div>
        </div>
        <div class="budget-card-footer">
            <span class="budget-date">Created: ${createdDate}</span>
            <div class="budget-actions">
                <button class="btn-action btn-view" data-budget-id="${budget.id || budget.budget_id}">View Details</button>
                <button class="btn-action btn-delete" data-budget-id="${budget.id || budget.budget_id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    // Add event listener to view button
    card.querySelector('.btn-view').addEventListener('click', function() {
        const budgetId = this.getAttribute('data-budget-id');
        window.location.href = `/budgets/${budgetId}`;
    });
    
    // Add event listener to delete button
    card.querySelector('.btn-delete').addEventListener('click', function() {
        const budgetId = this.getAttribute('data-budget-id');
        const budgetName = budget.budget_name;
        showDeleteConfirmation(budgetId, budgetName);
    });
    
    return card;
}

// Function to show delete confirmation modal
function showDeleteConfirmation(budgetId, budgetName) {
    // Create confirmation modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'delete-confirmation-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Delete Budget</h2>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete "${budgetName}"?</p>
                <p class="warning-text">This action cannot be undone. All transactions and sub-users associated with this budget will also be deleted.</p>
                <div class="form-actions">
                    <button class="btn-secondary cancel-btn">Cancel</button>
                    <button class="btn-danger confirm-delete-btn">Delete Budget</button>
                </div>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Display modal
    modal.style.display = 'flex';
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const confirmBtn = modal.querySelector('.confirm-delete-btn');
    
    // Close modal functions
    const closeModal = () => {
        modal.style.display = 'none';
        modal.remove();
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Close when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Delete budget when confirmed
    confirmBtn.addEventListener('click', async function() {
        try {
            // Show loading state
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            confirmBtn.disabled = true;
            
            const response = await fetch(`/api/budgets/${budgetId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete budget');
            }
            
            // Close modal
            closeModal();
            
            // Show success message
            showNotification('Budget Deleted Successfully', 'success');
            
            // Reload budgets
            loadBudgets();
            
        } catch (error) {
            console.error('Error deleting budget:', error);
            showNotification(error.message || 'Failed to delete budget', 'error');
            
            // Reset button
            confirmBtn.innerHTML = 'Delete Budget';
            confirmBtn.disabled = false;
        }
    });
}

// Updated pagination function
function createPagination(currentPage, totalPages, totalItems) {
    const paginationContainer = document.getElementById('pagination-controls');
    paginationContainer.innerHTML = '';
    
    // Only show pagination if there's more than one page
    if (totalPages <= 1) {
        return;
    }
    
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
        prevBtn.addEventListener('click', () => loadBudgets(currentPage - 1));
        paginationContainer.appendChild(prevBtn);
    }
    
    // Page buttons
    // Limit visible page buttons to 3 for cleaner UI
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
        pageBtn.addEventListener('click', () => loadBudgets(i));
        paginationContainer.appendChild(pageBtn);
    }
    
    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', () => loadBudgets(currentPage + 1));
        paginationContainer.appendChild(nextBtn);
    }
}

// The old displayNotification is now replaced by the showNotification function
function displayNotification(message, type = 'info') {
    showNotification(message, type);
}