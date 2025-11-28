import { API_CONFIG } from '../config';

// Token management
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

export const getAccessToken = (): string | null => {
  if (!accessToken) {
    accessToken = localStorage.getItem('access_token');
  }
  return accessToken;
};

// Request types
interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  requiresAuth?: boolean;
}

// Response wrapper
interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

// Error class
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base HTTP client
class HttpClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    // If baseURL is empty (relative paths), just use the endpoint
    if (!this.baseURL) {
      let url = endpoint;
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString;
        }
      }
      return url;
    }
    
    // Use absolute URL with baseURL
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private getHeaders(options?: RequestOptions): HeadersInit {
    const headers: HeadersInit = {
      ...API_CONFIG.HEADERS,
      ...options?.headers,
    };

    // Add auth token if required
    if (options?.requiresAuth !== false) {
      const token = getAccessToken();
      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      let errorDetails = null;

      if (isJson) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.detail || errorMessage;
          errorDetails = errorData;
        } catch {
          // Ignore JSON parse errors
        }
      }

      throw new ApiError(response.status, errorMessage, errorDetails);
    }

    if (response.status === 204) {
      return {} as T;
    }

    if (isJson) {
      const data = await response.json();
      // Handle FastAPI response format
      return data.data !== undefined ? data.data : data;
    }

    return response as any;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, requiresAuth = true, ...fetchOptions } = options;
    
    const url = this.buildUrl(endpoint, params);
    const headers = this.getHeaders({ ...options, requiresAuth });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return await this.handleResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError(408, 'Request timeout');
        }
        throw new ApiError(0, error.message);
      }

      throw new ApiError(0, 'Unknown error occurred');
    }
  }

  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Upload with FormData
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<T> {
    const { headers, ...rest } = options || {};
    
    return this.request<T>(endpoint, {
      ...rest,
      method: 'POST',
      body: formData,
      headers: {
        // Let browser set Content-Type for FormData
        ...headers,
        'Content-Type': undefined as any,
      } as HeadersInit,
    });
  }

  // Download file
  async download(
    endpoint: string,
    options?: RequestOptions
  ): Promise<Blob> {
    const url = this.buildUrl(endpoint, options?.params);
    const headers = this.getHeaders(options);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new ApiError(response.status, `Download failed: ${response.statusText}`);
    }

    return response.blob();
  }
}

// Export singleton instance
export const apiClient = new HttpClient();


