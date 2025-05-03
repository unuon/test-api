// register.js - Optimized Version
document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const toggleIcon = themeToggle.querySelector('i');
    
    // Check for saved theme preference or use device preference
    const savedTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    // Apply the saved theme
    applyTheme(savedTheme);
    
    // Toggle theme when button is clicked
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

    // Form validation - Optimized
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return; // Exit if form not found
    
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('password_confirmation');
    const submitButton = document.querySelector('.btn-primary');
    
    let isSubmitting = false;
    let loadingTimer = null;
    
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Initially disable submit button
    submitButton.disabled = true;
    submitButton.classList.add('disabled');
    
    // Simplified validation function
    function validateForm() {
        if (isSubmitting) return;
        
        // Quick validation checks
        const isNameValid = nameInput.value.trim() !== '';
        const isEmailValid = emailInput.value.trim() !== '' && emailRegex.test(emailInput.value.trim());
        const isPasswordValid = passwordInput.value.trim().length >= 8;
        const isConfirmPasswordValid = confirmPasswordInput.value === passwordInput.value && confirmPasswordInput.value !== '';
        
        // Apply visual feedback
        toggleInvalidClass(nameInput, !isNameValid && nameInput.value.trim() !== '');
        toggleInvalidClass(emailInput, !isEmailValid && emailInput.value.trim() !== '');
        toggleInvalidClass(passwordInput, !isPasswordValid && passwordInput.value.trim() !== '');
        toggleInvalidClass(confirmPasswordInput, !isConfirmPasswordValid && confirmPasswordInput.value !== '');
        
        // Enable/disable button
        const isFormValid = isNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid;
        submitButton.disabled = !isFormValid;
        submitButton.classList.toggle('disabled', !isFormValid);
    }
    
    // Helper function for cleaner validation code
    function toggleInvalidClass(element, shouldBeInvalid) {
        if (shouldBeInvalid) {
            element.classList.add('is-invalid');
        } else {
            element.classList.remove('is-invalid');
        }
    }
    
    // Add input event listeners with debouncing for better performance
    const inputs = [nameInput, emailInput, passwordInput, confirmPasswordInput];
    let debounceTimer;
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(validateForm, 150); // 150ms debounce
        });
    });
    
    // Simplified loading state function
    function setLoading(isLoading) {
        isSubmitting = isLoading;
        
        if (loadingTimer) {
            clearTimeout(loadingTimer);
            loadingTimer = null;
        }
        
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            
            // Shorter timeout (5 seconds)
            loadingTimer = setTimeout(() => {
                showMessage('Request is taking longer than expected. You can try again.', 'warning');
                setLoading(false);
            }, 5000);
        } else {
            submitButton.classList.remove('loading');
            validateForm(); // Reapply validation state
        }
    }
    
    // Helper function to show messages
    function showMessage(message, type = 'danger') {
        const container = document.createElement('div');
        container.className = `alert alert-${type}`;
        container.textContent = message;
        
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) existingAlert.remove();
        
        const formGroups = document.querySelectorAll('.form-group');
        registerForm.insertBefore(container, formGroups[0]);
    }
    
    // Reset form helper
    function resetForm() {
        registerForm.reset();
        inputs.forEach(input => input.classList.remove('is-invalid'));
        submitButton.disabled = true;
        submitButton.classList.add('disabled');
    }
    
    // Form submission handler - Optimized
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        // Final validation before submission
        validateForm();
        if (submitButton.disabled) return;
        
        // Set loading state
        setLoading(true);
        
        // Get form data efficiently
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const passwordConfirmation = confirmPasswordInput.value;
        const csrfToken = document.querySelector('input[name="_token"]').value;
        
        try {
            // Single network request with optimized headers
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Cache-Control': 'no-cache',
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    password_confirmation: passwordConfirmation
                })
            });
            
            // Clear timeout since we got a response
            if (loadingTimer) {
                clearTimeout(loadingTimer);
                loadingTimer = null;
            }
            
            const data = await response.json();
            
            if (response.ok) {
                // Success - store message and redirect immediately
                sessionStorage.setItem(
                    'registrationSuccess', 
                    'Account created successfully! Please check your email for verification instructions.'
                );
                
                // Clean reset before redirect
                resetForm();
                
                // Redirect without delay
                window.location.href = '/';
            } else {
                // Error handling - Show main error message
                setLoading(false);
                showMessage(data.message || 'Registration failed. Please try again.');
                
                // Handle field-specific errors if available
                if (data.errors) {
                    handleValidationErrors(data.errors);
                }
            }
        } catch (error) {
            // Network error handling
            if (loadingTimer) {
                clearTimeout(loadingTimer);
                loadingTimer = null;
            }
            
            setLoading(false);
            showMessage('Connection error. Please try again.');
        }
    });
    
    // Helper for field-specific validation errors
    function handleValidationErrors(errors) {
        for (const field in errors) {
            const input = document.getElementById(field);
            if (!input) continue;
            
            input.classList.add('is-invalid');
            
            // Show specific error message if possible
            const feedback = input.nextElementSibling;
            if (feedback && feedback.classList.contains('invalid-feedback')) {
                feedback.textContent = errors[field][0];
            }
        }
    }
});