// API Configuration
const API_BASE_URL = 'http://localhost:3001';

// API Client
class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.token = localStorage.getItem('authToken');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options,
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                
                // For login/register endpoints, don't treat 401 as "Authentication failed"
                // Instead, show the actual error message
                if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/register')) {
                    this.setToken(null);
                    if (typeof showLogin === 'function') {
                        showLogin();
                    }
                }
                
                throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Authentication endpoints
    async login(credentials) {
        const response = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        
        this.setToken(response.token);
        return response;
    }

    async register(userData) {
        const response = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        
        this.setToken(response.token);
        return response;
    }

    async getProfile() {
        return await this.request('/api/auth/profile');
    }

    async updateProfile(data) {
        return await this.request('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async logout() {
        try {
            await this.request('/api/auth/logout', {
                method: 'POST',
            });
        } finally {
            this.setToken(null);
        }
    }

    // Transaction endpoints
    async getTransactions(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/api/transactions${queryString ? '?' + queryString : ''}`;
        return await this.request(endpoint);
    }

    async createTransaction(data) {
        return await this.request('/api/transactions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateTransaction(id, data) {
        return await this.request(`/api/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteTransaction(id) {
        return await this.request(`/api/transactions/${id}`, {
            method: 'DELETE',
        });
    }

    async getTransactionStats(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/api/transactions/summary/stats${queryString ? '?' + queryString : ''}`;
        return await this.request(endpoint);
    }

    // Category endpoints
    async getCategories() {
        return await this.request('/api/categories');
    }

    // AI endpoints
    async getAIInsights() {
        return await this.request('/api/ai/insights');
    }

    async categorizeTransaction(data) {
        return await this.request('/api/ai/categorize', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Health check
    async healthCheck() {
        return await this.request('/health');
    }
}

// Create global API client instance
const api = new ApiClient();