// Utility functions
if (typeof window.getDashboardPathForRole !== 'function') {
    window.getDashboardPathForRole = function getDashboardPathForRoleFallback(role) {
        switch ((role || '').toLowerCase()) {
            case 'consumer':
                return 'stories.html';
            case 'writer':
                return 'home.html';
            case 'artist':
                return 'home.html';
            case 'editor':
                return 'home.html';
            default:
                return 'home.html';
        }
    };
}
function showError(elementId, message, type = 'error') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.color = type === 'success' ? '#28a745' : '#dc3545';
    }
}

function resetErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.style.display = 'none';
    });
}

// Login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetErrors();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Store token in both localStorage and sessionStorage
            localStorage.setItem('token', data.token);
            sessionStorage.setItem('token', data.token);
            // Store user data
            sessionStorage.setItem('user', JSON.stringify(data.user));
            
            window.location.href = window.getDashboardPathForRole(data.user.role);
        } else {
            showError('generalError', data.message || 'Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('generalError', 'An error occurred during login. Please try again.');
    }
});

// Check if user is logged in
function isLoggedIn() {
    return sessionStorage.getItem('user') !== null;
}

// Logout function
function handleLogout() {
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = 'login.html';
}

// Check auth on page load for protected routes
document.addEventListener('DOMContentLoaded', () => {
    const isProtectedRoute = !window.location.pathname.includes('login.html') && 
                            !window.location.pathname.includes('register.html') &&
                            !window.location.pathname.includes('home.html');

    if (isProtectedRoute && !isLoggedIn()) {
        window.location.href = 'login.html';
    }
});

// Registration handling
if (document.getElementById('registerForm')) {
    const registerForm = document.getElementById('registerForm');
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetErrors();
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const name = document.getElementById('name').value.trim();
        const role = document.getElementById('role').value;
        
        // Basic validation
        if (!username || !email || !password || !name || !role) {
            showError('generalError', 'All fields are required');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('emailError', 'Please enter a valid email address');
            return;
        }

        // Password validation
        if (password.length < 6) {
            showError('passwordError', 'Password must be at least 6 characters');
            return;
        }

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    name,
                    role
                })
            });

            const data = await response.json();
            
            if (response.ok) {  // Changed from data.success to response.ok
                // Show success message and redirect
                showError('successMessage', 'Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html?registered=true';
                }, 2000);
            } else {
                showError('generalError', data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showError('generalError', 'An error occurred during registration');
        }
    });
}

// Password visibility toggle
document.querySelector('.toggle-password')?.addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Check for registration success message
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('registered') === 'true') {
    showError('generalError', 'Registration successful! Please login.', 'success');
}
const isProtectedRoute = !window.location.pathname.includes('login.html') && 
                        !window.location.pathname.includes('register.html') &&
                        !window.location.pathname.includes('home.html');
