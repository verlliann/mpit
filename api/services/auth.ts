import { apiClient, setAccessToken, getAccessToken } from '../client';
import { API_ENDPOINTS } from '../../config';
import type { LoginRequest, LoginResponse, UserProfile } from '../types';

// Mock data for demo purposes
const DEMO_CREDENTIALS = {
  email: 'demo@sirius-dms.com',
  password: 'password'
};

const MOCK_USER: UserProfile = {
  id: 'demo-user-1',
  email: 'demo@sirius-dms.com',
  first_name: 'Демо',
  last_name: 'Пользователь',
  role: 'admin',
  avatar_url: undefined,
};

export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Try demo credentials first (mock authentication)
    if (credentials.email === DEMO_CREDENTIALS.email && 
        credentials.password === DEMO_CREDENTIALS.password) {
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      setAccessToken(mockToken);
      
      const mockResponse: LoginResponse = {
        access_token: mockToken,
        token_type: 'Bearer',
        user: MOCK_USER
      };
      
      console.log('✅ Mock authentication successful');
      return mockResponse;
    }
    
    // Try real API if credentials don't match demo
    try {
      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials,
        { requiresAuth: false }
      );
      
      // Store token
      setAccessToken(response.access_token);
      
      return response;
    } catch (error) {
      // If API is not available, show better error message
      throw new Error('Неверный email или пароль. Используйте тестовые данные: demo@sirius-dms.com / password');
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      setAccessToken(null);
    }
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfile> {
    const token = getAccessToken();
    
    // If using mock token, return mock user
    if (token && token.startsWith('mock-jwt-token-')) {
      return MOCK_USER;
    }
    
    return apiClient.get<UserProfile>(API_ENDPOINTS.AUTH.ME);
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refresh_token: refreshToken },
      { requiresAuth: false }
    );
    
    setAccessToken(response.access_token);
    
    return response;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return getAccessToken() !== null;
  },

  /**
   * Register new user (if applicable)
   */
  async register(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data,
      { requiresAuth: false }
    );
    
    setAccessToken(response.access_token);
    
    return response;
  },
};


