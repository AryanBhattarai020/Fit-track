/**
 * Analytics Module - Professional Financial Analytics with Chart.js
 * Provides comprehensive charts, insights, and financial analysis
 */
class AnalyticsManager {
    constructor() {
        this.charts = {};
        this.chartColors = {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#06b6d4',
            light: '#f1f5f9',
            dark: '#1e293b'
        };
        
        this.categoryColors = [
            '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
            '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
        ];
        
        this.currentPeriod = 30;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Wait for Chart.js to be available
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js not loaded, retrying...');
                setTimeout(() => this.initialize(), 100);
                return;
            }

            // Configure Chart.js defaults
            Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
            Chart.defaults.font.size = 12;
            Chart.defaults.color = '#64748b';
            Chart.defaults.plugins.legend.position = 'bottom';
            Chart.defaults.plugins.legend.labels.usePointStyle = true;
            Chart.defaults.plugins.legend.labels.padding = 20;

            this.isInitialized = true;
            await this.updateAnalytics();
            console.log('Analytics initialized successfully');
        } catch (error) {
            console.error('Error initializing analytics:', error);
        }
    }

    async updateAnalytics() {
        if (!this.isInitialized) {
            await this.initialize();
            return;
        }

        try {
            const transactions = await this.getFilteredTransactions();
            
            // Update summary cards
            this.updateSummaryCards(transactions);
            
            // Update all charts
            await Promise.all([
                this.updateTrendsChart(transactions),
                this.updateCategoryChart(transactions),
                this.updateMonthlyChart(transactions),
                this.updateBudgetChart(transactions),
                this.updateTopCategories(transactions),
                this.updateSpendingPatterns(transactions),
                this.updateFinancialInsights(transactions)
            ]);

            console.log('Analytics updated successfully');
        } catch (error) {
            console.error('Error updating analytics:', error);
            this.showError('Failed to update analytics. Please try again.');
        }
    }

    async getFilteredTransactions() {
        try {
            const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            
            if (this.currentPeriod === 'all') {
                return allTransactions;
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.currentPeriod);

            return allTransactions.filter(transaction => {
                const transactionDate = new Date(transaction.date);
                return transactionDate >= cutoffDate;
            });
        } catch (error) {
            console.error('Error filtering transactions:', error);
            return [];
        }
    }

    updateSummaryCards(transactions) {
        const totalTransactions = transactions.length;
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const avgTransaction = totalTransactions > 0 ? 
            (totalIncome + totalExpenses) / totalTransactions : 0;

        document.getElementById('analytics-total-transactions').textContent = totalTransactions;
        document.getElementById('analytics-total-income').textContent = this.formatCurrency(totalIncome);
        document.getElementById('analytics-total-expenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('analytics-avg-transaction').textContent = this.formatCurrency(avgTransaction);
    }

    async updateTrendsChart(transactions) {
        const ctx = document.getElementById('trends-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.trends) {
            this.charts.trends.destroy();
        }

        // Prepare data for the last 30 days
        const days = 30;
        const labels = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            const dayIncome = transactions
                .filter(t => t.type === 'income' && t.date === dateStr)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            const dayExpense = transactions
                .filter(t => t.type === 'expense' && t.date === dateStr)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            incomeData.push(dayIncome);
            expenseData.push(dayExpense);
        }

        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Income',
                    data: incomeData,
                    borderColor: this.chartColors.success,
                    backgroundColor: this.chartColors.success + '20',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: this.chartColors.danger,
                    backgroundColor: this.chartColors.danger + '20',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Using custom legend in HTML
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        },
                        grid: {
                            borderDash: [2, 2]
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    async updateCategoryChart(transactions) {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        // Get expense transactions and group by category
        const expenses = transactions.filter(t => t.type === 'expense');
        const categoryData = {};
        
        expenses.forEach(transaction => {
            const category = transaction.category || 'Uncategorized';
            categoryData[category] = (categoryData[category] || 0) + parseFloat(transaction.amount);
        });

        if (Object.keys(categoryData).length === 0) {
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
            return;
        }

        const sortedCategories = Object.entries(categoryData)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10); // Top 10 categories

        const labels = sortedCategories.map(([category]) => category);
        const data = sortedCategories.map(([,amount]) => amount);

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: this.categoryColors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Using custom legend
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formatCurrency(context.raw)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });

        // Update category legend
        this.updateCategoryLegend(sortedCategories);
    }

    updateCategoryLegend(categoryData) {
        const legendContainer = document.getElementById('category-legend');
        if (!legendContainer) return;

        const total = categoryData.reduce((sum, [,amount]) => sum + amount, 0);
        
        legendContainer.innerHTML = categoryData.map(([category, amount], index) => {
            const percentage = ((amount / total) * 100).toFixed(1);
            const color = this.categoryColors[index % this.categoryColors.length];
            
            return `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: ${color}"></span>
                    <span class="legend-label">${category}</span>
                    <span class="legend-value">${this.formatCurrency(amount)} (${percentage}%)</span>
                </div>
            `;
        }).join('');
    }

    async updateMonthlyChart(transactions) {
        const ctx = document.getElementById('monthly-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.monthly) {
            this.charts.monthly.destroy();
        }

        // Get last 6 months of data
        const months = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            months.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            
            const monthIncome = transactions
                .filter(t => t.type === 'income' && t.date.startsWith(monthKey))
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            const monthExpense = transactions
                .filter(t => t.type === 'expense' && t.date.startsWith(monthKey))
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            incomeData.push(monthIncome);
            expenseData.push(monthExpense);
        }

        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: this.chartColors.success,
                    borderRadius: 6,
                    borderSkipped: false
                }, {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: this.chartColors.danger,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        },
                        grid: {
                            borderDash: [2, 2]
                        }
                    }
                },
                animation: {
                    delay: (context) => context.dataIndex * 100,
                    duration: 800
                }
            }
        });
    }

    async updateBudgetChart(transactions) {
        const ctx = document.getElementById('budget-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.budget) {
            this.charts.budget.destroy();
        }

        // Simple budget vs actual comparison
        // For demo purposes, we'll set some budget targets
        const budgets = {
            'Food & Dining': 500,
            'Transportation': 300,
            'Shopping': 200,
            'Entertainment': 150
        };

        const expenses = transactions.filter(t => t.type === 'expense');
        const actualSpending = {};

        expenses.forEach(transaction => {
            const category = transaction.category || 'Other';
            actualSpending[category] = (actualSpending[category] || 0) + parseFloat(transaction.amount);
        });

        const categories = Object.keys(budgets);
        const budgetData = categories.map(cat => budgets[cat]);
        const actualData = categories.map(cat => actualSpending[cat] || 0);

        this.charts.budget = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Budget',
                    data: budgetData,
                    backgroundColor: this.chartColors.light,
                    borderColor: this.chartColors.primary,
                    borderWidth: 2,
                    borderRadius: 6
                }, {
                    label: 'Actual',
                    data: actualData,
                    backgroundColor: actualData.map((actual, index) => 
                        actual > budgetData[index] ? this.chartColors.danger : this.chartColors.success),
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = this.formatCurrency(context.raw);
                                if (context.datasetIndex === 1) {
                                    const budget = budgetData[context.dataIndex];
                                    const percentage = ((context.raw / budget) * 100).toFixed(1);
                                    return `${context.dataset.label}: ${value} (${percentage}% of budget)`;
                                }
                                return `${context.dataset.label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                animation: {
                    delay: (context) => context.dataIndex * 150,
                    duration: 1000
                }
            }
        });

        // Update budget insights
        this.updateBudgetInsights(categories, budgetData, actualData);
    }

    updateBudgetInsights(categories, budgets, actuals) {
        const insights = document.getElementById('budget-insights');
        if (!insights) return;

        const analysis = categories.map((category, index) => {
            const budget = budgets[index];
            const actual = actuals[index];
            const percentage = (actual / budget) * 100;
            const difference = actual - budget;
            
            return {
                category,
                budget,
                actual,
                percentage,
                difference,
                status: percentage > 100 ? 'over' : percentage > 80 ? 'warning' : 'good'
            };
        }).sort((a, b) => b.percentage - a.percentage);

        insights.innerHTML = `
            <div class="budget-summary">
                ${analysis.map(item => `
                    <div class="budget-item ${item.status}">
                        <div class="budget-category">${item.category}</div>
                        <div class="budget-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(100, item.percentage)}%"></div>
                            </div>
                            <div class="budget-text">
                                ${this.formatCurrency(item.actual)} / ${this.formatCurrency(item.budget)}
                                <span class="budget-percentage">${item.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateTopCategories(transactions) {
        const container = document.getElementById('top-categories');
        if (!container) return;

        const expenses = transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};

        expenses.forEach(transaction => {
            const category = transaction.category || 'Uncategorized';
            categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(transaction.amount);
        });

        const sortedCategories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        if (sortedCategories.length === 0) {
            container.innerHTML = '<p class="empty-state">No expense categories found</p>';
            return;
        }

        const total = sortedCategories.reduce((sum, [,amount]) => sum + amount, 0);

        container.innerHTML = sortedCategories.map(([category, amount], index) => {
            const percentage = ((amount / total) * 100).toFixed(1);
            const color = this.categoryColors[index % this.categoryColors.length];
            
            return `
                <div class="top-category-item">
                    <div class="category-info">
                        <div class="category-color" style="background-color: ${color}"></div>
                        <div class="category-details">
                            <div class="category-name">${category}</div>
                            <div class="category-amount">${this.formatCurrency(amount)}</div>
                        </div>
                    </div>
                    <div class="category-percentage">${percentage}%</div>
                </div>
            `;
        }).join('');
    }

    updateSpendingPatterns(transactions) {
        const container = document.getElementById('spending-patterns');
        if (!container) return;

        const patterns = this.analyzeSpendingPatterns(transactions);
        
        container.innerHTML = patterns.map(pattern => `
            <div class="pattern-item">
                <div class="pattern-icon"><i class="${pattern.icon}"></i></div>
                <div class="pattern-details">
                    <div class="pattern-title">${pattern.title}</div>
                    <div class="pattern-description">${pattern.description}</div>
                </div>
            </div>
        `).join('');
    }

    analyzeSpendingPatterns(transactions) {
        const patterns = [];
        const expenses = transactions.filter(t => t.type === 'expense');

        if (expenses.length === 0) {
            return [{
                icon: 'fas fa-info-circle',
                title: 'No Data',
                description: 'Add some transactions to see spending patterns'
            }];
        }

        // Average transaction amount
        const avgAmount = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0) / expenses.length;
        patterns.push({
            icon: 'fas fa-calculator',
            title: 'Average Expense',
            description: `${this.formatCurrency(avgAmount)} per transaction`
        });

        // Most frequent category
        const categoryFreq = {};
        expenses.forEach(t => {
            const cat = t.category || 'Uncategorized';
            categoryFreq[cat] = (categoryFreq[cat] || 0) + 1;
        });
        const topCategory = Object.entries(categoryFreq)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (topCategory) {
            patterns.push({
                icon: 'fas fa-chart-pie',
                title: 'Most Frequent',
                description: `${topCategory[0]} (${topCategory[1]} transactions)`
            });
        }

        // Day of week pattern
        const dayFreq = {};
        expenses.forEach(t => {
            const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' });
            dayFreq[day] = (dayFreq[day] || 0) + 1;
        });
        const topDay = Object.entries(dayFreq)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (topDay) {
            patterns.push({
                icon: 'fas fa-calendar',
                title: 'Busiest Day',
                description: `${topDay[0]} (${topDay[1]} transactions)`
            });
        }

        return patterns;
    }

    updateFinancialInsights(transactions) {
        const container = document.getElementById('financial-insights');
        if (!container) return;

        const insights = this.generateFinancialInsights(transactions);
        
        container.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-icon">
                    <i class="${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                    ${insight.action ? `<div class="insight-action">${insight.action}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    generateFinancialInsights(transactions) {
        const insights = [];
        const expenses = transactions.filter(t => t.type === 'expense');
        const income = transactions.filter(t => t.type === 'income');

        if (transactions.length === 0) {
            return [{
                type: 'info',
                icon: 'fas fa-lightbulb',
                title: 'Welcome to Analytics!',
                description: 'Start adding transactions to get personalized financial insights.',
                action: 'Add your first transaction to begin tracking your financial health.'
            }];
        }

        // Income vs Expenses
        const totalIncome = income.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const netAmount = totalIncome - totalExpenses;

        if (netAmount > 0) {
            insights.push({
                type: 'success',
                icon: 'fas fa-trending-up',
                title: 'Positive Cash Flow',
                description: `You saved ${this.formatCurrency(netAmount)} this period. Great job managing your finances!`,
                action: 'Consider investing this surplus for long-term growth.'
            });
        } else if (netAmount < 0) {
            insights.push({
                type: 'warning',
                icon: 'fas fa-exclamation-triangle',
                title: 'Overspending Alert',
                description: `You spent ${this.formatCurrency(Math.abs(netAmount))} more than you earned this period.`,
                action: 'Review your top spending categories and consider budget adjustments.'
            });
        }

        // Category analysis
        const categoryTotals = {};
        expenses.forEach(t => {
            const cat = t.category || 'Uncategorized';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(t.amount);
        });

        const topCategory = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)[0];

        if (topCategory && topCategory[1] > totalExpenses * 0.3) {
            insights.push({
                type: 'info',
                icon: 'fas fa-chart-pie',
                title: 'Category Concentration',
                description: `${topCategory[0]} represents ${((topCategory[1]/totalExpenses)*100).toFixed(1)}% of your expenses.`,
                action: 'Consider if this allocation aligns with your financial goals.'
            });
        }

        // Spending frequency
        const avgDailySpending = totalExpenses / Math.max(1, this.currentPeriod === 'all' ? 30 : this.currentPeriod);
        insights.push({
            type: 'info',
            icon: 'fas fa-calendar-day',
            title: 'Daily Spending Average',
            description: `You spend an average of ${this.formatCurrency(avgDailySpending)} per day.`,
            action: `Monthly projection: ${this.formatCurrency(avgDailySpending * 30)}`
        });

        return insights;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }

    showError(message) {
        console.error('Analytics Error:', message);
        // You can implement a toast notification here
    }

    // Public method to update period
    setPeriod(period) {
        this.currentPeriod = period;
        this.updateAnalytics();
    }

    // Cleanup method
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
        this.isInitialized = false;
    }
}

// Create global instance
window.analyticsManager = new AnalyticsManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure Chart.js is loaded
    setTimeout(() => {
        window.analyticsManager.initialize();
    }, 500);
});