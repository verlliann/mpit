import { API_CONFIG } from '../config';

// Token management
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
    console.log('🔐 Token saved to localStorage:', {
      hasToken: !!token,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 30) + '...'
    });
  } else {
    localStorage.removeItem('access_token');
    console.log('🔓 Token removed from localStorage');
  }
};

export const getAccessToken = (): string | null => {
  // Always read from localStorage to ensure we have the latest token
  try {
    const token = localStorage.getItem('access_token');
    
    // If mock token detected, clear it immediately
    if (token && token.startsWith('mock-jwt-token-')) {
      console.error('❌ Mock token detected in localStorage! Clearing it...');
      localStorage.removeItem('access_token');
      accessToken = null;
      return null;
    }
    
    // Sync in-memory variable
    accessToken = token;
    
    if (token) {
      console.log('🔑 Token retrieved from localStorage:', {
        hasToken: !!token,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 30) + '...',
        isRealToken: !token.startsWith('mock-')
      });
    } else {
      console.warn('⚠️ No token found in localStorage');
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error reading from localStorage:', error);
    return null;
  }
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

  private getHeaders(options?: RequestOptions, isFormData: boolean = false): HeadersInit {
    const headers: HeadersInit = {};
    
    // Only add default headers if not FormData
    if (!isFormData) {
      Object.assign(headers, API_CONFIG.HEADERS);
    }
    
    // Add custom headers
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        // Skip Content-Type for FormData - browser will set it with boundary
        if (!(isFormData && key.toLowerCase() === 'content-type')) {
          headers[key] = value as string;
        }
      });
    }

    // Add auth token if required
    if (options?.requiresAuth !== false) {
      const token = getAccessToken();
      if (token && token.trim()) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token.trim()}`;
        // Always log
        console.log('✅ Adding Authorization header:', {
          hasToken: !!token,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 30) + '...',
          headerSet: true
        });
      } else {
        console.error('❌ No token available for authenticated request!');
        console.error('Debug info:', {
          token: token,
          tokenType: typeof token,
          localStorage_access_token: localStorage.getItem('access_token'),
          localStorage_allKeys: Object.keys(localStorage),
          requiresAuth: options?.requiresAuth
        });
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      // Log 401 errors for debugging
      if (response.status === 401) {
        const token = getAccessToken();
        console.error('❌ 401 Unauthorized Error:', {
          url: response.url,
          hasToken: !!token,
          tokenPreview: token ? `${token.substring(0, 30)}...` : 'none',
          tokenLength: token?.length || 0,
          localStorage: {
            access_token: localStorage.getItem('access_token') ? 'exists' : 'missing',
            allKeys: Object.keys(localStorage)
          }
        });
      }
      
      let errorMessage = `HTTP Error ${response.status}`;
      let errorDetails = null;

      if (isJson) {
        try {
          const errorData = await response.json();
          
          // Handle FastAPI validation errors (422)
          if (response.status === 422 && Array.isArray(errorData.detail)) {
            // Format validation errors into readable message
            const validationErrors = errorData.detail.map((err: any) => {
              const field = err.loc ? err.loc.slice(1).join('.') : 'field';
              return `${field}: ${err.msg}`;
            }).join('; ');
            errorMessage = `Validation error: ${validationErrors}`;
          } else {
            // Regular error message
            errorMessage = errorData.message || 
                          (typeof errorData.detail === 'string' ? errorData.detail : null) ||
                          errorMessage;
          }
          
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
    
    // Check if body is FormData
    const isFormData = fetchOptions.body instanceof FormData;
    const headers = this.getHeaders({ ...options, requiresAuth }, isFormData);

    // Log request details
    console.log('📤 Making request:', {
      method: fetchOptions.method || 'GET',
      url,
      requiresAuth,
      hasAuthHeader: !!(headers as Record<string, string>)['Authorization'],
      isFormData,
      contentType: (headers as Record<string, string>)['Content-Type'] || 'auto'
    });

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
    // Pass FormData directly to request - it will detect it and skip Content-Type
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }

  // Download file
  async download(
    endpoint: string,
    options?: RequestOptions
  ): Promise<Blob> {
    const url = this.buildUrl(endpoint, options?.params);
    const headers = this.getHeaders(options);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new ApiError(response.status, `Download failed: ${errorText || response.statusText}`);
      }

      return await response.blob();
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, `Download failed: ${error.message || 'Network error'}`);
    }
  }
}

// Export singleton instance
export const apiClient = new HttpClient();


