import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config';
import type { StorageInfo, StorageStats } from '../types';

export const storageService = {
  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    return apiClient.get<StorageInfo>(
      API_ENDPOINTS.STORAGE.INFO
    );
  },

  /**
   * Get storage statistics by type
   */
  async getStorageStats(): Promise<StorageStats> {
    return apiClient.get<StorageStats>(
      API_ENDPOINTS.STORAGE.STATS
    );
  },
};


