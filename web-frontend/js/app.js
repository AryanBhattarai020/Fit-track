// Main Application Module
class AppManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.categories = [];
        this.transactions = [];
        this.stats = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeNavigation();
        this.setupFormHandlers();
        this.loadInitialData();
    }

    bindEvents() {
        // Sidebar navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.showPage(page);
            });
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', this.toggleSidebar);
        }

        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar);
        }
    }

    initializeNavigation() {
        // Set today's date as default for transaction form
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    setupFormHandlers() {
        // Transaction form
        const transactionForm = document.getElementById('transaction-form');
        if (transactionForm) {
            transactionForm.addEventListener('submit', this.handleAddTransaction.bind(this));
        }

        // Auto-categorization on description change
        const descriptionInput = document.getElementById('description');
        if (descriptionInput) {
            let timeout;
            descriptionInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.suggestCategory(e.target.value);
                }, 500);
            });
        }
    }

    async loadInitialData() {
        try {
            await this.loadCategories();
            await this.loadTransactions();
            await this.loadStats();
            this.updateDashboard();
        } catch (error) {
            console.error('Error loading initial data:', error);
            showToast('Failed to load app data', 'error');
        }
    }

    async loadCategories() {
        try {
            const response = await api.getCategories();
            this.categories = response.categories || [];
        } catch (error) {
            console.error('Error loading categories from API:', error);
            // Use default categories if API fails
            this.categories = [
                { id: 1, name: 'Food & Dining', icon: 'fa-utensils' },
                { id: 2, name: 'Transportation', icon: 'fa-car' },
                { id: 3, name: 'Shopping', icon: 'fa-shopping-bag' },
                { id: 4, name: 'Entertainment', icon: 'fa-film' },
                { id: 5, name: 'Bills & Utilities', icon: 'fa-file-invoice' },
                { id: 6, name: 'Healthcare', icon: 'fa-heart' },
                { id: 7, name: 'Income', icon: 'fa-dollar-sign' },
                { id: 8, name: 'Other', icon: 'fa-ellipsis-h' }
            ];
        }
        
        this.populateCategorySelects();
        this.displayCategories();
    }

    async loadTransactions() {
        try {
            const response = await api.getTransactions({ limit: 100 });
            this.transactions = response.transactions || [];
        } catch (error) {
            console.error('Error loading transactions from API:', error);
            // Fall back to local storage
            this.transactions = this.getStoredTransactions();
        }
        
        this.displayRecentTransactions();
        this.displayAllTransactions();
    }

    async loadStats() {
        // Always calculate stats from current transactions to ensure accuracy
        this.calculateStatsFromTransactions();
        
        // Optional: Try to get additional stats from API if available
        try {
            const response = await api.getTransactionStats();
            // You can merge API stats with calculated stats if needed
            console.log('API stats available:', response);
        } catch (error) {
            console.log('Using calculated stats (API unavailable)');
        }
    }

    getStoredTransactions() {
        try {
            const stored = localStorage.getItem('finetrack_transactions');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading stored transactions:', error);
            return [];
        }
    }

    saveTransactions() {
        try {
            localStorage.setItem('finetrack_transactions', JSON.stringify(this.transactions));
        } catch (error) {
            console.error('Error saving transactions:', error);
        }
    }

    calculateStatsFromTransactions() {
        console.log('Calculating stats from transactions:', this.transactions.length, 'transactions');
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let totalIncome = 0;
        let totalExpenses = 0;
        let monthlyExpenses = 0;
        let monthlyIncome = 0;
        
        this.transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount || 0);
            const transactionDate = new Date(transaction.date);
            const isCurrentMonth = transactionDate.getMonth() === currentMonth && 
                                 transactionDate.getFullYear() === currentYear;
            
            if (transaction.type === 'income') {
                totalIncome += amount;
                if (isCurrentMonth) {
                    monthlyIncome += amount;
                }
            } else {
                totalExpenses += amount;
                if (isCurrentMonth) {
                    monthlyExpenses += amount;
                }
            }
        });
        
        const totalBalance = totalIncome - totalExpenses;
        const monthlyBudget = 2000; // Default budget
        const savingsGoal = 5000; // Default savings goal
        
        this.stats = {
            totalBalance: totalBalance,
            monthlyExpenses: monthlyExpenses,
            monthlyIncome: monthlyIncome,
            budgetRemaining: Math.max(0, monthlyBudget - monthlyExpenses),
            savingsProgress: totalBalance > 0 ? Math.min(100, (totalBalance / savingsGoal) * 100) : 0
        };
        
        console.log('Calculated stats:', this.stats);
    }

    populateCategorySelects() {
        const categorySelects = document.querySelectorAll('#category');
        categorySelects.forEach(select => {
            // Clear existing options except the first one
            select.innerHTML = '<option value="">Select Category</option>';
            
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        });
    }

    displayCategories() {
        const categoriesGrid = document.getElementById('categories-grid');
        if (!categoriesGrid) return;

        categoriesGrid.innerHTML = '';

        this.categories.forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            categoryCard.innerHTML = `
                <div class="category-icon">
                    <i class="fas ${category.icon || 'fa-tag'}"></i>
                </div>
                <div class="category-name">${category.name}</div>
                <div class="category-count">
                    ${this.getTransactionCountForCategory(category.id)} transactions
                </div>
            `;
            categoriesGrid.appendChild(categoryCard);
        });
    }

    getTransactionCountForCategory(categoryId) {
        return this.transactions.filter(t => t.category_id === categoryId).length;
    }

    displayRecentTransactions() {
        const recentContainer = document.getElementById('recent-transactions');
        if (!recentContainer) return;

        const recentTransactions = this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        if (recentTransactions.length === 0) {
            recentContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions yet</p>
                    <p>Start by adding your first expense!</p>
                </div>
            `;
            return;
        }

        recentContainer.innerHTML = '';
        recentTransactions.forEach(transaction => {
            const transactionEl = this.createTransactionElement(transaction);
            recentContainer.appendChild(transactionEl);
        });
    }

    displayAllTransactions() {
        const transactionsContainer = document.getElementById('transactions-list');
        if (!transactionsContainer) return;

        if (this.transactions.length === 0) {
            transactionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions found</p>
                    <p>Add your first transaction to get started!</p>
                </div>
            `;
            return;
        }

        transactionsContainer.innerHTML = '';
        const sortedTransactions = this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedTransactions.forEach(transaction => {
            const transactionEl = this.createTransactionElement(transaction);
            transactionsContainer.appendChild(transactionEl);
        });
    }

    createTransactionElement(transaction) {
        const category = this.categories.find(c => c.id === transaction.category_id);
        const categoryName = category ? category.name : 'Other';
        const categoryIcon = category ? category.icon : 'fa-tag';
        
        const transactionEl = document.createElement('div');
        transactionEl.className = `transaction-item ${transaction.type}`;
        
        const date = new Date(transaction.date).toLocaleDateString();
        const amount = Math.abs(parseFloat(transaction.amount || 0)).toFixed(2);
        
        transactionEl.innerHTML = `
            <div class="transaction-icon">
                <i class="fas ${categoryIcon}"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-meta">
                    <span class="transaction-category">${categoryName}</span>
                    <span class="transaction-date">${date}</span>
                    ${transaction.merchant ? `<span class="transaction-merchant">${transaction.merchant}</span>` : ''}
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'expense' ? '-' : '+'}$${amount}
            </div>
            <div class="transaction-actions">
                <button class="btn-icon" onclick="appManager.editTransaction(${transaction.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="appManager.deleteTransaction(${transaction.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return transactionEl;
    }

    updateDashboard() {
        console.log('Updating dashboard with stats:', this.stats);
        
        // Update stats cards
        const totalBalanceEl = document.getElementById('total-balance');
        if (totalBalanceEl) {
            totalBalanceEl.textContent = `$${(this.stats.totalBalance || 0).toFixed(2)}`;
        }
        
        const monthExpensesEl = document.getElementById('month-expenses');
        if (monthExpensesEl) {
            monthExpensesEl.textContent = `$${(this.stats.monthlyExpenses || 0).toFixed(2)}`;
        }
        
        const budgetRemainingEl = document.getElementById('budget-remaining');
        if (budgetRemainingEl) {
            budgetRemainingEl.textContent = `$${(this.stats.budgetRemaining || 0).toFixed(2)}`;
        }
        
        const savingsProgressEl = document.getElementById('savings-progress');
        if (savingsProgressEl) {
            savingsProgressEl.textContent = `${(this.stats.savingsProgress || 0).toFixed(1)}%`;
        }

        // Update health score
        const healthScore = this.calculateHealthScore();
        const healthScoreEl = document.getElementById('health-score');
        if (healthScoreEl) {
            healthScoreEl.textContent = `${healthScore}/100`;
        }
        
        console.log('Dashboard updated successfully');
    }
    
    async forceRefreshDashboard() {
        console.log('Force refreshing dashboard...');
        await this.loadStats();
        this.updateDashboard();
        this.displayRecentTransactions();
        this.displayAllTransactions();
        this.displayCategories();
        
        // Always refresh analytics if available (regardless of current page)
        if (window.analyticsManager) {
            window.analyticsManager.updateAnalytics();
        }
    }

    calculateHealthScore() {
        // Simple health score calculation
        let score = 70; // Base score
        
        if (this.stats.budgetRemaining > 0) score += 15;
        if (this.stats.savingsProgress > 10) score += 10;
        if (this.transactions.length > 10) score += 5; // Active user bonus
        
        return Math.min(100, Math.max(0, score));
    }

    async handleAddTransaction(e) {
        e.preventDefault();
        
        const formData = {
            amount: parseFloat(document.getElementById('amount').value),
            type: document.getElementById('type').value,
            description: document.getElementById('description').value.trim(),
            merchant: document.getElementById('merchant').value.trim() || null,
            category_id: parseInt(document.getElementById('category').value) || null,
            date: document.getElementById('date').value,
            payment_method: document.getElementById('payment-method').value,
            notes: document.getElementById('notes').value.trim() || null
        };

        if (!this.validateTransaction(formData)) {
            return;
        }

        try {
            showLoading();
            
            // Try to create transaction via API first
            let newTransaction;
            try {
                const response = await api.createTransaction(formData);
                newTransaction = response.transaction;
                this.transactions.unshift(newTransaction);
                console.log('Transaction created via API:', newTransaction);
            } catch (apiError) {
                console.error('API transaction creation failed, saving locally:', apiError);
                // Fall back to local storage if API fails
                newTransaction = {
                    id: Date.now(), // Simple ID generation
                    ...formData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                this.transactions.unshift(newTransaction);
                showToast('Transaction saved locally (offline mode)', 'warning');
            }
            
            // Always save to localStorage as backup
            this.saveTransactions();
            
            // Force refresh dashboard and all displays
            await this.forceRefreshDashboard();
            
            // Clear form
            document.getElementById('transaction-form').reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').value = today;
            
            showToast('Transaction added successfully!', 'success');
            this.showPage('dashboard');
            
        } catch (error) {
            console.error('Error adding transaction:', error);
            showToast(error.message || 'Failed to add transaction', 'error');
        } finally {
            hideLoading();
        }
    }

    validateTransaction(data) {
        if (!data.amount || data.amount <= 0) {
            showToast('Please enter a valid amount', 'error');
            document.getElementById('amount').focus();
            return false;
        }

        if (!data.description) {
            showToast('Please enter a description', 'error');
            document.getElementById('description').focus();
            return false;
        }

        if (!data.date) {
            showToast('Please select a date', 'error');
            document.getElementById('date').focus();
            return false;
        }

        return true;
    }

    async suggestCategory(description) {
        if (!description || description.length < 3) return;

        // Simple local category suggestion based on keywords
        const suggestions = {
            'restaurant': 1, 'food': 1, 'lunch': 1, 'dinner': 1, 'breakfast': 1, 'cafe': 1,
            'gas': 2, 'uber': 2, 'taxi': 2, 'bus': 2, 'train': 2, 'car': 2,
            'store': 3, 'shop': 3, 'amazon': 3, 'buy': 3, 'purchase': 3,
            'movie': 4, 'cinema': 4, 'netflix': 4, 'game': 4, 'entertainment': 4,
            'electric': 5, 'water': 5, 'internet': 5, 'phone': 5, 'bill': 5,
            'doctor': 6, 'hospital': 6, 'pharmacy': 6, 'medicine': 6, 'health': 6,
            'salary': 7, 'income': 7, 'bonus': 7, 'freelance': 7
        };
        
        const lowerDesc = description.toLowerCase();
        for (const [keyword, categoryId] of Object.entries(suggestions)) {
            if (lowerDesc.includes(keyword)) {
                const categorySelect = document.getElementById('category');
                if (categorySelect) {
                    categorySelect.value = categoryId;
                }
                break;
            }
        }
    }

    async deleteTransaction(id) {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }

        try {
            this.transactions = this.transactions.filter(t => t.id != id);
            this.saveTransactions();
            
            await this.forceRefreshDashboard();
            
            showToast('Transaction deleted successfully', 'info');
            
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showToast('Failed to delete transaction', 'error');
        }
    }

    editTransaction(id) {
        // For now, just show a message. Full edit functionality can be added later
        showToast('Edit functionality coming soon!', 'info');
    }

    showPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update page title
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = this.getPageTitle(pageName);
        }

        // Show/hide pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        this.currentPage = pageName;

        // Close sidebar on mobile after navigation
        if (window.innerWidth <= 768) {
            this.closeSidebar();
        }

        // Load page-specific data
        this.loadPageData(pageName);
    }

    getPageTitle(pageName) {
        const titles = {
            'dashboard': 'Dashboard',
            'transactions': 'Transactions',
            'add-transaction': 'Add Transaction',
            'categories': 'Categories',
            'analytics': 'Analytics'
        };
        return titles[pageName] || 'Fine Track';
    }

    async loadPageData(pageName) {
        switch (pageName) {
            case 'dashboard':
                await this.forceRefreshDashboard();
                break;
            case 'transactions':
                await this.loadTransactions();
                break;
            case 'add-transaction':
                // Ensure categories are loaded for the form
                if (this.categories.length === 0) {
                    await this.loadCategories();
                }
                break;
            case 'categories':
                await this.loadCategories();
                break;
            case 'analytics':
                // Update analytics charts and data
                if (window.analyticsManager) {
                    window.analyticsManager.updateAnalytics();
                }
                break;
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainApp = document.getElementById('main-app');
        
        sidebar.classList.toggle('open');
        if (mainApp) {
            mainApp.classList.toggle('sidebar-open');
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainApp = document.getElementById('main-app');
        
        sidebar.classList.remove('open');
        if (mainApp) {
            mainApp.classList.remove('sidebar-open');
        }
    }
}

// Global functions
function showPage(pageName) {
    if (appManager) {
        appManager.showPage(pageName);
    }
}

function toggleSidebar() {
    if (appManager) {
        appManager.toggleSidebar();
    }
}

// Analytics-specific functions
function updateAnalyticsPeriod(period) {
    if (window.analyticsManager) {
        window.analyticsManager.setPeriod(period);
    }
}

// Initialize app manager
let appManager;
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for auth to initialize first
    setTimeout(() => {
        appManager = new AppManager();
    }, 100);
});