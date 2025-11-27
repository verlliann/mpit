import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config';
import type {
  DashboardMetrics,
  WorkflowData,
  DocumentTypesData,
  DocumentsFlowData,
} from '../types';

export const analyticsService = {
  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return apiClient.get<DashboardMetrics>(
      API_ENDPOINTS.ANALYTICS.DASHBOARD
    );
  },

  /**
   * Get workflow data (incoming vs processed)
   */
  async getWorkflowData(params?: { period?: string }): Promise<WorkflowData[]> {
    return apiClient.get<WorkflowData[]>(
      API_ENDPOINTS.ANALYTICS.WORKFLOW,
      { params }
    );
  },

  /**
   * Get document types distribution
   */
  async getDocumentTypes(): Promise<DocumentTypesData[]> {
    return apiClient.get<DocumentTypesData[]>(
      API_ENDPOINTS.ANALYTICS.TYPES
    );
  },

  /**
   * Get documents flow over time
   */
  async getDocumentsFlow(params?: { days?: number }): Promise<DocumentsFlowData[]> {
    return apiClient.get<DocumentsFlowData[]>(
      API_ENDPOINTS.ANALYTICS.DOCUMENTS_FLOW,
      { params }
    );
  },

  /**
   * Get all analytics metrics
   */
  async getMetrics(params?: { period?: string }): Promise<{
    dashboard: DashboardMetrics;
    workflow: WorkflowData[];
    types: DocumentTypesData[];
    flow: DocumentsFlowData[];
  }> {
    return apiClient.get(
      API_ENDPOINTS.ANALYTICS.METRICS,
      { params }
    );
  },
};


