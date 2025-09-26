// Main Application Initialization and Utilities
class FineTrackApp {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.setupToastSystem();
        this.setupErrorHandling();
        this.initialized = true;
        
        console.log('Fine Track app initialized successfully');
    }

    setupGlobalEventListeners() {
        // Handle window resize for responsive behavior
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Handle clicks outside sidebar to close it on mobile
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        
        // Handle escape key to close modals/sidebar
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        // Prevent double form submissions
        document.addEventListener('submit', this.handleFormSubmit.bind(this));
    }

    handleResize() {
        // Close sidebar on larger screens
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            const mainApp = document.getElementById('main-app');
            if (sidebar) sidebar.classList.remove('open');
            if (mainApp) mainApp.classList.remove('sidebar-open');
        }
    }

    handleOutsideClick(e) {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        
        if (sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
                if (appManager) {
                    appManager.closeSidebar();
                }
            }
        }
    }

    handleKeydown(e) {
        if (e.key === 'Escape') {
            // Close sidebar if open
            const sidebar = document.getElementById('sidebar');
            if (sidebar?.classList.contains('open')) {
                if (appManager) {
                    appManager.closeSidebar();
                }
            }
        }
    }

    handleFormSubmit(e) {
        const form = e.target;
        if (form.tagName === 'FORM') {
            // Disable submit button to prevent double submissions
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                setTimeout(() => {
                    submitBtn.disabled = false;
                }, 2000);
            }
        }
    }

    setupToastSystem() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            showToast('Something went wrong. Please try again.', 'error');
        });

        // Promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            showToast('An unexpected error occurred.', 'error');
        });
    }
}

// Toast/Notification System
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = getToastIcon(type);
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="removeToast(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

function removeToast(toast) {
    if (!toast) return;
    
    toast.classList.remove('show');
    toast.classList.add('hide');
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}

// Utility Functions
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Theme and Preference Management
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
        showToast(`Switched to ${this.currentTheme} theme`, 'info');
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.init();
    }

    init() {
        if ('performance' in window) {
            this.trackPageLoad();
        }
    }

    trackPageLoad() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paintEntries = performance.getEntriesByType('paint');
            
            this.metrics = {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime,
                firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime
            };
            
            console.log('Performance metrics:', this.metrics);
        });
    }

    trackApiCall(endpoint, startTime, endTime, success) {
        const duration = endTime - startTime;
        console.log(`API call to ${endpoint}: ${duration}ms (${success ? 'success' : 'error'})`);
        
        if (!this.metrics.apiCalls) {
            this.metrics.apiCalls = [];
        }
        
        this.metrics.apiCalls.push({
            endpoint,
            duration,
            success,
            timestamp: Date.now()
        });
    }
}

// Storage utility
class StorageManager {
    static setItem(key, value, encrypt = false) {
        try {
            const data = encrypt ? btoa(JSON.stringify(value)) : JSON.stringify(value);
            localStorage.setItem(key, data);
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    static getItem(key, decrypt = false) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;
            
            const parsed = decrypt ? JSON.parse(atob(data)) : JSON.parse(data);
            return parsed;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return null;
        }
    }

    static removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
        }
    }

    static clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
        }
    }
}

// Service Worker registration (for future PWA features)
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('SW registered: ', registration);
            } catch (error) {
                console.log('SW registration failed: ', error);
            }
        });
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize core app
    window.fineTrackApp = new FineTrackApp();
    
    // Initialize theme manager
    window.themeManager = new ThemeManager();
    
    // Initialize performance monitoring
    window.performanceMonitor = new PerformanceMonitor();
    
    // Register service worker for future PWA features
    // registerServiceWorker();
    
    console.log('All systems initialized');
});

// Export utilities for global use
window.showToast = showToast;
window.removeToast = removeToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.debounce = debounce;
window.throttle = throttle;
window.StorageManager = StorageManager;