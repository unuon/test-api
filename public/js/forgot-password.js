// forgot-password.js - Optimized Version
document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality - kept minimal
    setupThemeToggle();
    
    // Form elements
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (!forgotPasswordForm) return;
    
    const emailInput = document.getElementById('email');
    const submitButton = document.querySelector('.btn-primary');
    const csrfToken = document.querySelector('input[name="_token"]').value;
    
    // State variables
    let isSubmitting = false;
    let loadingTimer = null;
    let debounceTimer = null;
    
    // Simple email regex for validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Initial button state
    submitButton.disabled = true;
    submitButton.classList.add('disabled');
    
    // Debounced validation for better performance
    emailInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(validateForm, 150);
    });
    
    // Validation function
    function validateForm() {
        if (isSubmitting) return;
        
        const isEmailValid = emailInput.value.trim() !== '' && 
                            emailRegex.test(emailInput.value.trim());
        
        // Visual feedback
        if (emailInput.value.trim() !== '' && !isEmailValid) {
            emailInput.classList.add('is-invalid');
        } else {
            emailInput.classList.remove('is-invalid');
        }
        
        // Button state
        submitButton.disabled = !isEmailValid;
        submitButton.classList.toggle('disabled', !isEmailValid);
    }
    
    // Loading state manager
    function setLoading(isLoading) {
        isSubmitting = isLoading;
        
        if (loadingTimer) {
            clearTimeout(loadingTimer);
            loadingTimer = null;
        }
        
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            
            // Shorter 5s timeout for better UX
            loadingTimer = setTimeout(() => {
                showMessage('Request is taking longer than expected. Please try again.', 'warning');
                setLoading(false);
            }, 5000);
        } else {
            submitButton.classList.remove('loading');
            validateForm();
        }
    }
    
    // Message display helper
    function showMessage(message, type = 'danger') {
        const container = document.createElement('div');
        container.className = `alert alert-${type}`;
        container.textContent = message;
        
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) existingAlert.remove();
        
        const formGroups = document.querySelectorAll('.form-group');
        forgotPasswordForm.insertBefore(container, formGroups[0]);
    }
    
    // Form submission
    forgotPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        const isEmailValid = emailInput.value.trim() !== '' && 
                            emailRegex.test(emailInput.value.trim());
        
        if (!isEmailValid) return;
        
        // Set loading state
        setLoading(true);
        
        const email = emailInput.value.trim();
        
        try {
            // Optimized fetch with proper headers
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({ email })
            });
            
            if (loadingTimer) {
                clearTimeout(loadingTimer);
                loadingTimer = null;
            }
            
            const data = await response.json();
            
            if (response.ok) {
                // Success case
                showMessage(
                    data.message || 'Password reset link has been sent to your email.', 
                    'success'
                );
                
                // Clear form
                emailInput.value = '';
                submitButton.disabled = true;
                submitButton.classList.add('disabled');
            } else {
                // Error case
                showMessage(data.message || 'Failed to send password reset link.');
            }
            
            setLoading(false);
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            if (loadingTimer) {
                clearTimeout(loadingTimer);
                loadingTimer = null;
            }
            
            setLoading(false);
            showMessage('Connection error. Please try again.');
        }
    });
    
    // Theme toggle functionality
    function setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;
        
        const htmlElement = document.documentElement;
        const toggleIcon = themeToggle.querySelector('i');
        
        // Apply saved theme
        const savedTheme = localStorage.getItem('theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        applyTheme(savedTheme);
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
        
        function applyTheme(theme) {
            htmlElement.setAttribute('data-theme', theme);
            
            if (theme === 'dark') {
                toggleIcon.classList.remove('fa-moon');
                toggleIcon.classList.add('fa-sun');
            } else {
                toggleIcon.classList.remove('fa-sun');
                toggleIcon.classList.add('fa-moon');
            }
        }
    }
});