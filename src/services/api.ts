class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'https://api.antifraudster.com/v1') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge any additional headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request<{
      token: string;
      user: any;
      expires_in: number;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.token = response.token;
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    password: string;
  }) {
    const response = await this.request<{
      token: string;
      user: any;
      expires_in: number;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    this.token = response.token;
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async logout() {
    if (this.token) {
      await this.request('/auth/logout', { method: 'POST' });
    }
    
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  async refreshToken() {
    const response = await this.request<{
      token: string;
      expires_in: number;
    }>('/auth/refresh', {
      method: 'POST',
    });

    this.token = response.token;
    localStorage.setItem('auth_token', response.token);
    
    return response;
  }

  // Vendor Management
  async getVendorProfile() {
    return this.request<any>('/vendor/profile');
  }

  async updateVendorProfile(data: any) {
    return this.request<any>('/vendor/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async generateApiKey() {
    return this.request<{ api_key: string }>('/vendor/api-key', {
      method: 'POST',
    });
  }

  async updateIntegration(data: {
    website_url: string;
    api_key?: string;
    webhook_url?: string;
  }) {
    return this.request<any>('/vendor/integration', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Transactions
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const queryString = params 
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    
    return this.request<{
      transactions: any[];
      total: number;
      page: number;
      total_pages: number;
    }>(`/transactions${queryString}`);
  }

  async getTransaction(id: string) {
    return this.request<any>(`/transactions/${id}`);
  }

  // Analytics
  async getAnalytics(params?: {
    period?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const queryString = params 
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    
    return this.request<any>(`/analytics${queryString}`);
  }

  async getDashboardStats() {
    return this.request<{
      total_transactions: number;
      fraud_detected: number;
      safe_transactions: number;
      average_fraud_probability: number;
      fraud_trends: any[];
      recent_alerts: any[];
    }>('/analytics/dashboard');
  }

  // Fraud Detection
  async analyzeTransaction(transactionData: {
    buyer_email: string;
    amount: number;
    payment_method: string;
    ip_address: string;
    device_fingerprint?: string;
    billing_address?: any;
    shipping_address?: any;
  }) {
    return this.request<{
      status: 'safe' | 'fraud' | 'suspicious';
      risk_score: number;
      explanation: string;
      transaction_id: string;
      recommendations: string[];
    }>('/fraud/analyze', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  // Alerts
  async getFraudAlerts(params?: {
    page?: number;
    limit?: number;
    severity?: string;
    status?: string;
  }) {
    const queryString = params 
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    
    return this.request<{
      alerts: any[];
      total: number;
      page: number;
      total_pages: number;
    }>(`/alerts${queryString}`);
  }

  async updateAlertStatus(alertId: string, status: string) {
    return this.request<any>(`/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Products
  async getProducts(params?: {
    page?: number;
    limit?: number;
  }) {
    const queryString = params 
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    
    return this.request<{
      products: any[];
      total: number;
    }>(`/products${queryString}`);
  }

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`);
  }

  async updateProduct(id: string, data: any) {
    return this.request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Real-time metrics
  async getRealtimeMetrics() {
    return this.request<{
      totalTransactions: number;
      fraudDetected: number;
      safeTransactions: number;
      avgFraudProbability: number;
    }>('/metrics/realtime');
  }

  // Transaction stream
  async getTransactionStream(limit?: number) {
    const queryString = limit ? `?limit=${limit}` : '';
    return this.request<any[]>(`/transactions/stream${queryString}`);
  }

  // Chart data
  async getChartData(type: 'fraud-trend' | 'risk-distribution' | 'transaction-volume', period?: string) {
    const queryString = period ? `?period=${period}` : '';
    return this.request<any>(`/analytics/charts/${type}${queryString}`);
  }
}

export const apiService = new ApiService();
export default apiService;