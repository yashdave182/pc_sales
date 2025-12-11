// API Service for Sales Management System
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Customer,
  Product,
  Sale,
  SaleCreate,
  SaleDetails,
  Payment,
  Demo,
  Distributor,
  DashboardMetrics,
  SalesTrendData,
  RecentSale,
  UpcomingDemo,
  PendingPayment,
  ProductPerformance,
  PaymentDistribution,
  DemoConversionStats,
  SalesSummary,
  CustomerSummary,
  ApiResponse,
  PaginationParams,
  FileUpload,
  UploadResponse,
} from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle errors globally
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.error('Unauthorized access');
    } else if (error.response?.status === 500) {
      console.error('Server error');
    }
    return Promise.reject(error);
  }
);

// Error handler
const handleError = (error: any): never => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    throw new Error(message);
  }
  throw error;
};

// ==================== Dashboard APIs ====================

export const dashboardAPI = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    try {
      const response = await apiClient.get<DashboardMetrics>('/api/dashboard/metrics');
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getSalesTrend: async (days: number = 30): Promise<SalesTrendData[]> => {
    try {
      const response = await apiClient.get<SalesTrendData[]>('/api/dashboard/sales-trend', {
        params: { days },
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getRecentSales: async (limit: number = 10): Promise<RecentSale[]> => {
    try {
      const response = await apiClient.get<RecentSale[]>('/api/dashboard/recent-sales', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getUpcomingDemos: async (limit: number = 10): Promise<UpcomingDemo[]> => {
    try {
      const response = await apiClient.get<UpcomingDemo[]>('/api/dashboard/upcoming-demos', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== Customer APIs ====================

export const customerAPI = {
  getAll: async (params?: PaginationParams): Promise<ApiResponse<Customer[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Customer[]>>('/api/customers', { params });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getById: async (id: number): Promise<Customer> => {
    try {
      const response = await apiClient.get<Customer>(`/api/customers/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  create: async (customer: Customer): Promise<ApiResponse<Customer>> => {
    try {
      const response = await apiClient.post<ApiResponse<Customer>>('/api/customers', customer);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  update: async (id: number, customer: Customer): Promise<ApiResponse<Customer>> => {
    try {
      const response = await apiClient.put<ApiResponse<Customer>>(
        `/api/customers/${id}`,
        customer
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/api/customers/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== Product APIs ====================

export const productAPI = {
  getAll: async (): Promise<Product[]> => {
    try {
      const response = await apiClient.get<Product[]>('/api/products');
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  create: async (product: Product): Promise<ApiResponse<Product>> => {
    try {
      const response = await apiClient.post<ApiResponse<Product>>('/api/products', product);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== Sales APIs ====================

export const salesAPI = {
  getAll: async (params?: PaginationParams): Promise<Sale[]> => {
    try {
      const response = await apiClient.get<Sale[]>('/api/sales', { params });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getById: async (id: number): Promise<SaleDetails> => {
    try {
      const response = await apiClient.get<SaleDetails>(`/api/sales/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  create: async (sale: SaleCreate): Promise<ApiResponse<Sale>> => {
    try {
      const response = await apiClient.post<ApiResponse<Sale>>('/api/sales', sale);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== Payment APIs ====================

export const paymentAPI = {
  getAll: async (params?: PaginationParams): Promise<Payment[]> => {
    try {
      const response = await apiClient.get<Payment[]>('/api/payments', { params });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getPending: async (): Promise<PendingPayment[]> => {
    try {
      const response = await apiClient.get<PendingPayment[]>('/api/payments/pending');
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  create: async (payment: Payment): Promise<ApiResponse<Payment>> => {
    try {
      const response = await apiClient.post<ApiResponse<Payment>>('/api/payments', payment);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== Demo APIs ====================

export const demoAPI = {
  getAll: async (params?: PaginationParams): Promise<Demo[]> => {
    try {
      const response = await apiClient.get<Demo[]>('/api/demos', { params });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  create: async (demo: Demo): Promise<ApiResponse<Demo>> => {
    try {
      const response = await apiClient.post<ApiResponse<Demo>>('/api/demos', demo);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  updateStatus: async (
    id: number,
    status: string,
    notes?: string
  ): Promise<ApiResponse<Demo>> => {
    try {
      const response = await apiClient.put<ApiResponse<Demo>>(`/api/demos/${id}`, {
        conversion_status: status,
        notes,
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== Distributor APIs ====================

export const distributorAPI = {
  getAll: async (params?: PaginationParams): Promise<Distributor[]> => {
    try {
      const response = await apiClient.get<Distributor[]>('/api/distributors', { params });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  create: async (distributor: Distributor): Promise<ApiResponse<Distributor>> => {
    try {
      const response = await apiClient.post<ApiResponse<Distributor>>(
        '/api/distributors',
        distributor
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== Reports APIs ====================

export const reportsAPI = {
  getSalesSummary: async (startDate?: string, endDate?: string): Promise<SalesSummary> => {
    try {
      const response = await apiClient.get<SalesSummary>('/api/reports/sales-summary', {
        params: { start_date: startDate, end_date: endDate },
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getCustomerSummary: async (): Promise<CustomerSummary> => {
    try {
      const response = await apiClient.get<CustomerSummary>('/api/reports/customer-summary');
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getProductPerformance: async (): Promise<ProductPerformance[]> => {
    try {
      const response = await apiClient.get<ProductPerformance[]>(
        '/api/reports/product-performance'
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== Analytics APIs ====================

export const analyticsAPI = {
  getPaymentDistribution: async (): Promise<PaymentDistribution[]> => {
    try {
      const response = await apiClient.get<PaymentDistribution[]>(
        '/api/analytics/payment-distribution'
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getDemoConversion: async (): Promise<DemoConversionStats[]> => {
    try {
      const response = await apiClient.get<DemoConversionStats[]>(
        '/api/analytics/demo-conversion'
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== File Upload APIs ====================

export const fileAPI = {
  upload: async (file: File): Promise<UploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<UploadResponse>('/api/upload/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getAll: async (): Promise<FileUpload[]> => {
    try {
      const response = await apiClient.get<FileUpload[]>('/api/files');
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// ==================== Health Check ====================

export const healthAPI = {
  check: async (): Promise<{ status: string; database: string }> => {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// Export all APIs
export default {
  dashboard: dashboardAPI,
  customers: customerAPI,
  products: productAPI,
  sales: salesAPI,
  payments: paymentAPI,
  demos: demoAPI,
  distributors: distributorAPI,
  reports: reportsAPI,
  analytics: analyticsAPI,
  files: fileAPI,
  health: healthAPI,
};
