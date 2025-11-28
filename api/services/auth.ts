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
    // Always use real API
    try {
      // Clear any existing mock tokens first
      const existingToken = localStorage.getItem('access_token');
      if (existingToken && existingToken.startsWith('mock-jwt-token-')) {
        console.warn('⚠️ Clearing existing mock token before login');
        localStorage.removeItem('access_token');
      }
      
      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials,
        { requiresAuth: false }
      );
      
      // Store token - verify it's a real JWT token
      if (response.access_token) {
        // Verify it's not a mock token
        if (response.access_token.startsWith('mock-jwt-token-')) {
          console.error('❌ Server returned mock token! This should not happen.');
          throw new Error('Invalid token received from server');
        }
        
        setAccessToken(response.access_token);
        console.log('✅ Authentication successful, real token stored:', {
          hasToken: !!response.access_token,
          tokenLength: response.access_token.length,
          tokenPreview: response.access_token.substring(0, 30) + '...',
          isJWT: response.access_token.split('.').length === 3
        });
      } else {
        console.error('❌ No access_token in response:', response);
        throw new Error('No access token received from server');
      }
      
      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Неверный email или пароль');
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
    
    // If using mock token, clear it and throw error
    if (token && token.startsWith('mock-jwt-token-')) {
      console.error('❌ Mock token detected! Clearing it...');
      setAccessToken(null);
      throw new Error('Invalid token. Please login again.');
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


