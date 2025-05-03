// login.js
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

    // Check for registration success message
    const registrationSuccess = sessionStorage.getItem('registrationSuccess');
    if (registrationSuccess) {
        const successAlert = document.getElementById('registrationSuccessAlert');
        if (successAlert) {
            successAlert.textContent = registrationSuccess;
            successAlert.style.display = 'block';
        }
        // Clear the message so it doesn't show again on refresh
        sessionStorage.removeItem('registrationSuccess');
    }
    
    // Get the login form and form elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitButton = document.querySelector('.btn-primary');
    
    // Timer variable for the loading timeout
    let loadingTimer = null;
    
    // Flag to track if form is currently submitting
    let isSubmitting = false;
    
    // Email regex pattern
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    
    // Initially disable the submit button
    submitButton.disabled = true;
    submitButton.classList.add('disabled');
    
    // Helper function to validate form and toggle button state
    function validateForm() {
        // Don't re-enable if currently submitting
        if (isSubmitting) return;
        
        const isEmailValid = emailInput.value.trim() !== '' && emailRegex.test(emailInput.value.trim());
        const isPasswordValid = passwordInput.value.trim() !== '';
        
        // Email validation feedback - only show errors, not success state
        if (emailInput.value.trim() !== '' && !isEmailValid) {
            emailInput.classList.add('is-invalid');
        } else {
            emailInput.classList.remove('is-invalid');
        }
        
        // Password validation feedback - only show errors, not success state
        if (passwordInput.value.trim() === '') {
            passwordInput.classList.add('is-invalid');
        } else {
            passwordInput.classList.remove('is-invalid');
        }
        
        // Enable/disable button based on validation
        if (isEmailValid && isPasswordValid) {
            submitButton.disabled = false;
            submitButton.classList.remove('disabled');
        } else {
            submitButton.disabled = true;
            submitButton.classList.add('disabled');
        }
    }
    
    // Add input event listeners to validate in real-time
    emailInput.addEventListener('input', validateForm);
    passwordInput.addEventListener('input', validateForm);
    
    // Function to set loading state
    function setLoading(isLoading) {
        isSubmitting = isLoading;
        
        // Clear any existing timer
        if (loadingTimer) {
            clearTimeout(loadingTimer);
            loadingTimer = null;
        }
        
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            
            // Set a 10-second timeout to reset the button state
            loadingTimer = setTimeout(() => {
                // Show timeout message
                const errorContainer = document.createElement('div');
                errorContainer.className = 'alert alert-warning';
                errorContainer.textContent = 'Request is taking longer than expected. You can try again.';
                
                // Remove any existing error messages
                const existingAlert = document.querySelector('.alert');
                if (existingAlert) {
                    existingAlert.remove();
                }
                
                const formGroups = document.querySelectorAll('.form-group');
                loginForm.insertBefore(errorContainer, formGroups[0]);
                
                // Reset the button
                setLoading(false);
            }, 10000); // 10 seconds
        } else {
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            
            // Re-run validation to set correct state
            validateForm();
        }
    }
    
    // Form submission handler
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Prevent multiple submissions
            if (isSubmitting) return;
            
            // Double-check validation before submission
            const isEmailValid = emailInput.value.trim() !== '' && emailRegex.test(emailInput.value.trim());
            const isPasswordValid = passwordInput.value.trim() !== '';
            
            if (!isEmailValid || !isPasswordValid) {
                return; // Don't proceed if validation fails
            }
            
            // Set loading state
            setLoading(true);
            
            const formData = new FormData(loginForm);
            const email = formData.get('email');
            const password = formData.get('password');
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('input[name="_token"]').value
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                });
                
                const data = await response.json();
                
                // Clear the timeout since we got a response
                if (loadingTimer) {
                    clearTimeout(loadingTimer);
                    loadingTimer = null;
                }
                
                if (response.ok) {
                    // Store the token in localStorage for API requests
                    if (data.access_token) {
                        localStorage.setItem('token', data.access_token);
                        
                        // Wait for the token to be set in session before redirecting
                        try {
                            const sessionResponse = await fetch('/set-session-token', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': document.querySelector('input[name="_token"]').value
                                },
                                body: JSON.stringify({ token: data.access_token })
                            });
                            
                            if (sessionResponse.ok) {
                                const sessionData = await sessionResponse.json();
                                console.log('Session token set successfully', sessionData);
                                
                                // Make a test verification request before redirecting
                                try {
                                    const verifyResponse = await fetch('/verify-session', {
                                        method: 'GET',
                                        headers: {
                                            'X-CSRF-TOKEN': document.querySelector('input[name="_token"]').value
                                        }
                                    });
                                    
                                    if (verifyResponse.ok) {
                                        window.location.href = '/dashboard';
                                    } else {
                                        console.error('Session verification failed');
                                        // Try anyway after a longer delay
                                        setTimeout(() => window.location.href = '/dashboard', 1500);
                                    }
                                } catch (error) {
                                    console.error('Error verifying session:', error);
                                    // Try anyway after a longer delay
                                    setTimeout(() => window.location.href = '/dashboard', 1500);
                                }
                            } else {
                                console.error('Failed to set session token');
                                window.location.href = '/dashboard'; // Try anyway
                            }
                        } catch (error) {
                            console.error('Error setting session token:', error);
                            window.location.href = '/dashboard'; // Try anyway
                        }
                    } else {
                        console.error('No access token received');
                        window.location.href = '/';
                    }
                } else {
                    // Failed login
                    setLoading(false); // Reset button state
                    
                    const errorContainer = document.createElement('div');
                    
                    // Check if it's an email verification issue
                    if (data.email_verified_at === null) {
                        errorContainer.className = 'alert alert-warning';
                        errorContainer.innerHTML = 'Your email address has not been verified. <br>Please check your inbox for a verification email or <a href="#" class="resend-link">click here</a> to resend the verification email.';
                        
                        // Remove any existing error messages
                        const existingAlert = document.querySelector('.alert');
                        if (existingAlert) {
                            existingAlert.remove();
                        }
                        
                        const formGroups = document.querySelectorAll('.form-group');
                        loginForm.insertBefore(errorContainer, formGroups[0]);
                        
                        // Add event listener for resend link
                        setTimeout(() => {
                            const resendLink = document.querySelector('.resend-link');
                            if (resendLink) {
                                resendLink.addEventListener('click', async function(e) {
                                    e.preventDefault();
                                    
                                    try {        
                                        const resendResponse = await fetch('/api/resend-verification', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRF-TOKEN': document.querySelector('input[name="_token"]').value
                                            },
                                            body: JSON.stringify({
                                                email: emailInput.value
                                            })
                                        });
                                        
                                        // Check if response is JSON
                                        const contentType = resendResponse.headers.get("content-type");
                                        if (contentType && contentType.indexOf("application/json") !== -1) {
                                            const resendData = await resendResponse.json();

                                            
                                            if (resendResponse.ok) {
                                                errorContainer.className = 'alert alert-success';
                                                errorContainer.innerHTML = 'Verification email has been resent. Please check your inbox.';
                                            } else {
                                                errorContainer.className = 'alert alert-danger';
                                                errorContainer.textContent = resendData.message || 'Failed to resend verification email. Please try again.';
                                            }
                                        } else {
                                  
                                            errorContainer.className = 'alert alert-danger';
                                            errorContainer.textContent = 'Server error. Please try again later.';
                                        }
                                    } catch (error) {
                                        errorContainer.className = 'alert alert-danger';
                                        errorContainer.textContent = 'Connection error. Please try again.';
                                    }
                                });
                            }
                        }, 100);
                    } else {
                        // Regular error message
                        errorContainer.className = 'alert alert-danger';
                        errorContainer.textContent = data.message || 'Invalid email or password';
                        
                        // Remove any existing error messages
                        const existingAlert = document.querySelector('.alert');
                        if (existingAlert) {
                            existingAlert.remove();
                        }
                        
                        const formGroups = document.querySelectorAll('.form-group');
                        loginForm.insertBefore(errorContainer, formGroups[0]);
                    }
                }
            } catch (error) {
                
                // Clear the timeout since we got a response (albeit an error)
                if (loadingTimer) {
                    clearTimeout(loadingTimer);
                    loadingTimer = null;
                }
                
                setLoading(false); // Reset button state on error
                
                // Show generic error message
                const errorContainer = document.createElement('div');
                errorContainer.className = 'alert alert-danger';
                errorContainer.textContent = 'Connection error. Please try again.';
                
                // Remove any existing error messages
                const existingAlert = document.querySelector('.alert');
                if (existingAlert) {
                    existingAlert.remove();
                }
                
                const formGroups = document.querySelectorAll('.form-group');
                loginForm.insertBefore(errorContainer, formGroups[0]);
            }
        });
    }
});