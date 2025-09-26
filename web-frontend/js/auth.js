// Authentication Module
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!this.validateLogin(email, password)) {
            return;
        }

        // Disable submit button to prevent double submission
        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';

        try {
            showLoading();
            
            const response = await api.login({ email, password });
            
            this.currentUser = response.user;
            this.updateUserDisplay();
            
            showToast(`Welcome back, ${response.user.firstName}!`, 'success');
            
            // Clear the login form
            document.getElementById('login-form').reset();
            
            showMainApp();
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Show specific error messages
            let errorMessage = 'Login failed. Please try again.';
            if (error.message.includes('Invalid credentials') || error.message.includes('401')) {
                errorMessage = 'Invalid email or password. Please check your credentials.';
            } else if (error.message.includes('Network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            showToast(errorMessage, 'error');
            
            // Focus back to email field for retry
            document.getElementById('login-email').focus();
            
        } finally {
            hideLoading();
            
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('register-firstname').value.trim();
        const lastName = document.getElementById('register-lastname').value.trim();
        const email = document.getElementById('register-email').value.trim().toLowerCase();
        const password = document.getElementById('register-password').value;
        const monthlyIncome = document.getElementById('register-income').value;

        if (!this.validateRegister(firstName, lastName, email, password)) {
            return;
        }

        // Disable submit button to prevent double submission
        const submitBtn = document.querySelector('#register-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';

        try {
            showLoading();
            
            const userData = {
                firstName: firstName,
                lastName: lastName,
                email,
                password
            };

            if (monthlyIncome && parseFloat(monthlyIncome) > 0) {
                userData.monthlyIncome = parseFloat(monthlyIncome);
            }

            const response = await api.register(userData);
            
            this.currentUser = response.user;
            this.updateUserDisplay();
            
            // Clear the registration form
            document.getElementById('register-form').reset();
            
            showToast(`Welcome to Fine Track, ${response.user.firstName}! Your account has been created successfully.`, 'success');
            showMainApp();
            
        } catch (error) {
            console.error('Registration error:', error);
            
            // Show specific error messages
            let errorMessage = 'Registration failed. Please try again.';
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                errorMessage = 'An account with this email already exists. Please try logging in instead.';
            } else if (error.message.includes('validation') || error.message.includes('invalid')) {
                errorMessage = 'Please check your information and try again.';
            } else if (error.message.includes('Network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            showToast(errorMessage, 'error');
            
            // Focus back to first name field for retry
            document.getElementById('register-firstname').focus();
            
        } finally {
            hideLoading();
            
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    validateLogin(email, password) {
        if (!email.trim()) {
            showToast('Please enter your email address.', 'error');
            document.getElementById('login-email').focus();
            return false;
        }

        if (!this.isValidEmail(email)) {
            showToast('Please enter a valid email address.', 'error');
            document.getElementById('login-email').focus();
            return false;
        }

        if (!password.trim()) {
            showToast('Please enter your password.', 'error');
            document.getElementById('login-password').focus();
            return false;
        }

        return true;
    }

    validateRegister(firstName, lastName, email, password) {
        // Validate first name
        if (!firstName.trim()) {
            showToast('Please enter your first name.', 'error');
            document.getElementById('register-firstname').focus();
            return false;
        }
        
        if (firstName.length < 2) {
            showToast('First name must be at least 2 characters long.', 'error');
            document.getElementById('register-firstname').focus();
            return false;
        }

        // Validate last name
        if (!lastName.trim()) {
            showToast('Please enter your last name.', 'error');
            document.getElementById('register-lastname').focus();
            return false;
        }
        
        if (lastName.length < 2) {
            showToast('Last name must be at least 2 characters long.', 'error');
            document.getElementById('register-lastname').focus();
            return false;
        }

        // Validate email
        if (!email.trim()) {
            showToast('Please enter your email address.', 'error');
            document.getElementById('register-email').focus();
            return false;
        }

        if (!this.isValidEmail(email)) {
            showToast('Please enter a valid email address (e.g., name@example.com).', 'error');
            document.getElementById('register-email').focus();
            return false;
        }

        // Validate password
        if (!password.trim()) {
            showToast('Please enter a password.', 'error');
            document.getElementById('register-password').focus();
            return false;
        }

        if (password.length < 8) {
            showToast('Password must be at least 8 characters long.', 'error');
            document.getElementById('register-password').focus();
            return false;
        }

        // Strong password validation
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
            showToast('Password must contain at least one uppercase letter, one lowercase letter, and one number.', 'error');
            document.getElementById('register-password').focus();
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        // More comprehensive email validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showLogin();
            return;
        }

        try {
            showLoading();
            const response = await api.getProfile();
            
            this.currentUser = response.user;
            this.updateUserDisplay();
            showMainApp();
            
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('authToken');
            showLogin();
        } finally {
            hideLoading();
        }
    }

    updateUserDisplay() {
        if (!this.currentUser) return;
        
        const userNameEl = document.getElementById('user-name');
        const userEmailEl = document.getElementById('user-email');
        
        if (userNameEl) {
            userNameEl.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
        
        if (userEmailEl) {
            userEmailEl.textContent = this.currentUser.email;
        }
    }

    async logout() {
        if (!confirm('Are you sure you want to log out?')) {
            return;
        }

        try {
            showLoading();
            
            // Clear local data first
            this.currentUser = null;
            
            // Try to notify server
            await api.logout();
            
            showToast('You have been logged out successfully!', 'success');
            
        } catch (error) {
            console.error('Logout error:', error);
            // Still proceed with logout even if server call fails
            showToast('Logged out (offline)', 'info');
            
        } finally {
            // Always clear local state and show login
            api.setToken(null);
            this.currentUser = null;
            
            // Clear any cached app data
            localStorage.removeItem('finetrack_transactions');
            
            hideLoading();
            showLogin();
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser && !!localStorage.getItem('authToken');
    }
}

// UI Helper Functions
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentNode.querySelector('.toggle-password');
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function showLogin() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('register-page').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
    
    // Clear forms
    document.getElementById('login-form').reset();
}

function showRegister() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('register-page').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
    
    // Clear forms
    document.getElementById('register-form').reset();
}

function showMainApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('register-page').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
}

function showLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-screen').classList.add('hidden');
}

// Global logout function
function logout() {
    if (authManager) {
        authManager.logout();
    }
}

// Password strength checker
function checkPasswordStrength() {
    const password = document.getElementById('register-password').value;
    const strengthBar = document.getElementById('strength-progress');
    const strengthText = document.getElementById('strength-text');
    
    if (!password) {
        strengthBar.style.width = '0%';
        strengthBar.className = 'strength-progress';
        strengthText.textContent = 'Enter password';
        strengthText.className = 'strength-text';
        return;
    }
    
    let strength = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) {
        strength += 25;
    } else {
        feedback.push('at least 8 characters');
    }
    
    // Uppercase check
    if (/[A-Z]/.test(password)) {
        strength += 25;
    } else {
        feedback.push('uppercase letter');
    }
    
    // Lowercase check
    if (/[a-z]/.test(password)) {
        strength += 25;
    } else {
        feedback.push('lowercase letter');
    }
    
    // Number check
    if (/\d/.test(password)) {
        strength += 25;
    } else {
        feedback.push('number');
    }
    
    // Update strength bar
    strengthBar.style.width = strength + '%';
    
    // Update strength indicator
    if (strength < 50) {
        strengthBar.className = 'strength-progress weak';
        strengthText.textContent = 'Weak - Add: ' + feedback.join(', ');
        strengthText.className = 'strength-text weak';
    } else if (strength < 75) {
        strengthBar.className = 'strength-progress medium';
        strengthText.textContent = 'Medium - Add: ' + feedback.join(', ');
        strengthText.className = 'strength-text medium';
    } else if (strength < 100) {
        strengthBar.className = 'strength-progress strong';
        strengthText.textContent = 'Strong - Add: ' + feedback.join(', ');
        strengthText.className = 'strength-text strong';
    } else {
        strengthBar.className = 'strength-progress very-strong';
        strengthText.textContent = 'Very Strong ✓';
        strengthText.className = 'strength-text very-strong';
    }
}

// Initialize auth manager
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    
    // Make checkPasswordStrength globally available
    window.checkPasswordStrength = checkPasswordStrength;
});
