import axios, { AxiosError } from "axios";

// Resolve API base URL with multiple fallbacks and optional window override
const resolveApiBaseUrl = (): string => {
  // 1) Runtime override from window (if provided via script tag or inline config)
  const windowOverride =
    typeof window !== "undefined"
      ? (window as any).__API_BASE_URL__
      : undefined;

  // 2) Vite env vars (support both names)
  const envBase =
    (import.meta as any)?.env?.VITE_API_BASE_URL ||
    (import.meta as any)?.env?.VITE_API_URL;

  // 3) Default fallback
  const fallback = "https://pc-sales-8phu.onrender.com";

  const chosen = (windowOverride || envBase || fallback) as string;

  // Normalize trailing slashes
  return chosen.replace(/\/+$/, "");
};

// Create axios instance with base configuration
const API_BASE_URL = resolveApiBaseUrl();

// Log the chosen API base URL once at startup (useful for debugging mismatches)
if (typeof console !== "undefined") {
  // eslint-disable-next-line no-console
  console.info(`[API] Using base URL: ${API_BASE_URL}`);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,

  timeout: 30000, // 30 second timeout

  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      const timeoutError = new Error(
        "Request timeout - Server may be starting up",
      );
      (timeoutError as any).isTimeout = true;
      (timeoutError as any).status = 3000;
      throw timeoutError;
    }

    if (!error.response) {
      const networkError = new Error("Network error - Unable to reach server");
      (networkError as any).isNetworkError = true;
      throw networkError;
    }

    throw error;
  },
);

// Dashboard API
export const dashboardAPI = {
  getMetrics: async () => {
    const response = await apiClient.get("/api/dashboard/metrics");
    return response.data;
  },
  getRecentSales: async (limit?: number) => {
    const response = await apiClient.get("/api/dashboard/recent-sales", {
      params: limit ? { limit } : undefined,
    });
    return response.data;
  },
  getTopProducts: async () => {
    const response = await apiClient.get("/api/dashboard/top-products");
    return response.data;
  },
  getTopCustomers: async () => {
    const response = await apiClient.get("/api/dashboard/top-customers");
    return response.data;
  },
  getSalesChart: async (period: string = "7d") => {
    const response = await apiClient.get(
      `/api/dashboard/sales-chart?period=${period}`,
    );
    return response.data;
  },

  getSalesTrend: async (days?: number) => {
    const response = await apiClient.get("/api/dashboard/sales-trend", {
      params: days ? { days } : undefined,
    });
    return response.data;
  },

  getUpcomingDemos: async (limit?: number) => {
    const response = await apiClient.get("/api/dashboard/upcoming-demos", {
      params: limit ? { limit } : undefined,
    });

    return response.data;
  },
};

// Customer API
export const customerAPI = {
  getAll: async (params?: any) => {
    const response = await apiClient.get("/api/customers", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/api/customers/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post("/api/customers", data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/customers/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiClient.delete(`/api/customers/${id}`);
    return response.data;
  },
};

// Product API
export const productAPI = {
  getAll: async (params?: any) => {
    const response = await apiClient.get("/api/products", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/api/products/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post("/api/products", data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/products/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiClient.delete(`/api/products/${id}`);
    return response.data;
  },
};

// Distributor API
export const distributorAPI = {
  getAll: async (params?: any) => {
    const response = await apiClient.get("/api/distributors", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/api/distributors/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post("/api/distributors", data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/distributors/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiClient.delete(`/api/distributors/${id}`);
    return response.data;
  },
};

// Sales API
export const salesAPI = {
  getAll: async (params?: any) => {
    const response = await apiClient.get("/api/sales", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/api/sales/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post("/api/sales", data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/sales/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiClient.delete(`/api/sales/${id}`);
    return response.data;
  },
  getPending: async () => {
    const response = await apiClient.get("/api/sales/pending-payments");
    return response.data;
  },
};

// Payment API
export const paymentAPI = {
  getAll: async (params?: any) => {
    const response = await apiClient.get("/api/payments", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/api/payments/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post("/api/payments", data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/payments/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiClient.delete(`/api/payments/${id}`);
    return response.data;
  },
  getHistory: async (saleId: number) => {
    const response = await apiClient.get(`/api/payments/sale/${saleId}`);
    return response.data;
  },
  getPending: async () => {
    const response = await apiClient.get("/api/payments/pending");
    return response.data;
  },
};

// Demo API
export const demoAPI = {
  getAll: async (params?: any) => {
    const response = await apiClient.get("/api/demos", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/api/demos/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post("/api/demos", data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/demos/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiClient.delete(`/api/demos/${id}`);
    return response.data;
  },
};

export const automationAPI = {
  getCallingList: async (params?: {
    inactive_days?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get("/api/automation/calling-list", {
      params,
    });
    return response.data;
  },
  getInactiveInsights: async (inactive_days?: number) => {
    const response = await apiClient.get("/api/automation/insights/inactive", {
      params: inactive_days ? { inactive_days } : undefined,
    });
    return response.data;
  },
};
// File/Import API

export const fileAPI = {
  uploadFile: async (formData: FormData) => {
    const response = await apiClient.post("/api/import/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  upload: async (formData: FormData) => {
    const response = await apiClient.post("/api/import/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  getImportHistory: async () => {
    const response = await apiClient.get("/api/import/history");
    return response.data;
  },
};

// Export the axios instance for direct use if needed
export default apiClient;
