import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config';
import type {
  Settings,
  UpdateProfileRequest,
  ChangePasswordRequest,
  UserProfile,
} from '../types';

export const settingsService = {
  /**
   * Get user settings
   */
  async getSettings(): Promise<Settings> {
    return apiClient.get<Settings>(
      API_ENDPOINTS.SETTINGS.GET
    );
  },

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    return apiClient.patch<Settings>(
      API_ENDPOINTS.SETTINGS.UPDATE,
      settings
    );
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    return apiClient.patch<UserProfile>(
      API_ENDPOINTS.SETTINGS.PROFILE,
      data
    );
  },

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    return apiClient.post(
      API_ENDPOINTS.SETTINGS.SECURITY,
      data
    );
  },

  /**
   * Upload avatar
   */
  async uploadAvatar(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return apiClient.upload<UserProfile>(
      `${API_ENDPOINTS.SETTINGS.PROFILE}/avatar`,
      formData
    );
  },
};


