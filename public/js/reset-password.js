// reset-password.js - Optimized Version
document.addEventListener('DOMContentLoaded', function() {
    // Setup theme toggling
    setupThemeToggle();
    
    // Get form elements
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (!resetPasswordForm) return;
    
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('password_confirmation');
    const submitButton = document.querySelector('.btn-primary');
    const tokenInput = document.querySelector('input[name="token"]');
    const csrfToken = document.querySelector('input[name="_token"]').value;
    
    // State tracking
    let isSubmitting = false;
    let loadingTimer = null;
    let debounceTimer = null;
    
    // Initial button state
    submitButton.disabled = true;
    submitButton.classList.add('disabled');
    
    // Event listeners with debouncing
    [passwordInput, confirmPasswordInput].forEach(input => {
        input.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(validateForm, 150);
        });
    });
    
    // Validation function
    function validateForm() {
        if (isSubmitting) return;
        
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        
        const isPasswordValid = password.length >= 8;
        const isConfirmPasswordValid = password === confirmPassword && password !== '';
        
        // Visual feedback
        if (password !== '' && !isPasswordValid) {
            passwordInput.classList.add('is-invalid');
        } else {
            passwordInput.classList.remove('is-invalid');
        }
        
        if (confirmPassword !== '' && !isConfirmPasswordValid) {
            confirmPasswordInput.classList.add('is-invalid');
        } else {
            confirmPasswordInput.classList.remove('is-invalid');
        }
        
        // Button state
        const isFormValid = isPasswordValid && isConfirmPasswordValid;
        submitButton.disabled = !isFormValid;
        submitButton.classList.toggle('disabled', !isFormValid);
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
            
            // Shorter timeout
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
        resetPasswordForm.insertBefore(container, formGroups[0]);
    }
    
    // Form submission
    resetPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        
        const isPasswordValid = password.length >= 8;
        const isConfirmPasswordValid = password === confirmPassword && password !== '';
        
        if (!isPasswordValid || !isConfirmPasswordValid) return;
        
        setLoading(true);
        
        try {
            // Single optimized request
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    token: tokenInput.value,
                    password: password,
                    password_confirmation: confirmPassword
                })
            });
            
            if (loadingTimer) {
                clearTimeout(loadingTimer);
                loadingTimer = null;
            }
            
            const data = await response.json();
            
            if (response.ok) {
                // Success case
                showMessage(
                    data.message || 'Your password has been reset successfully.', 
                    'success'
                );
                
                // Disable form to prevent resubmission
                passwordInput.disabled = true;
                confirmPasswordInput.disabled = true;
                submitButton.disabled = true;
                
                // Immediate redirect (no 3-second delay)
                window.location.href = '/';
            } else {
                // Error case
                showMessage(data.message || 'Failed to reset password. Please try again.');
                setLoading(false);
            }
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