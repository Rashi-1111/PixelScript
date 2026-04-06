document.addEventListener('DOMContentLoaded', () => {
    // Handle password visibility toggle
    const togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const password = this.previousElementSibling;
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;

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
                    // Store token
                    if (remember) {
                        localStorage.setItem('token', data.token);
                    } else {
                        sessionStorage.setItem('token', data.token);
                    }
                    
                    // Store user data
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Redirect to home page
                    window.location.href = 'home.html';
                } else {
                    showError(data.message);
                }
            } catch (error) {
                showError('An error occurred during login');
            }
        });
    }

    // Handle registration form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            const genres = Array.from(document.querySelectorAll('input[name="genres"]:checked'))
                              .map(checkbox => checkbox.value);

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
                        role,
                        genres
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showSuccess(data.message);
                    // Redirect to login page after 2 seconds
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    showError(data.message);
                }
            } catch (error) {
                showError('An error occurred during registration');
            }
        });
    }

    // Helper functions for showing messages
    function showError(message) {
        const form = document.querySelector('.auth-form');
        const existingError = form.querySelector('.error-message');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'color: #dc3545; text-align: center; margin-top: 1rem; padding: 0.5rem; background: #ffe6e6; border-radius: 0.5rem;';
        errorDiv.textContent = message;
        form.appendChild(errorDiv);
    }

    function showSuccess(message) {
        const form = document.querySelector('.auth-form');
        const existingMessage = form.querySelector('.success-message');
        if (existingMessage) existingMessage.remove();

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = 'color: #28a745; text-align: center; margin-top: 1rem; padding: 0.5rem; background: #e8f5e9; border-radius: 0.5rem;';
        successDiv.textContent = message;
        form.appendChild(successDiv);
    }
}); 