import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config';
import type { Counterparty, Document } from '../../types';
import type {
  CounterpartyListParams,
  CounterpartyListResponse,
  CreateCounterpartyRequest,
  UpdateCounterpartyRequest,
  DocumentListResponse,
} from '../types';

export const counterpartiesService = {
  /**
   * Get list of counterparties
   */
  async getCounterparties(params?: CounterpartyListParams): Promise<CounterpartyListResponse> {
    return apiClient.get<CounterpartyListResponse>(
      API_ENDPOINTS.COUNTERPARTIES.LIST,
      { params }
    );
  },

  /**
   * Get single counterparty by ID
   */
  async getCounterparty(id: string): Promise<Counterparty> {
    return apiClient.get<Counterparty>(
      API_ENDPOINTS.COUNTERPARTIES.GET(id)
    );
  },

  /**
   * Create new counterparty
   */
  async createCounterparty(data: CreateCounterpartyRequest): Promise<Counterparty> {
    return apiClient.post<Counterparty>(
      API_ENDPOINTS.COUNTERPARTIES.CREATE,
      data
    );
  },

  /**
   * Update counterparty
   */
  async updateCounterparty(id: string, data: UpdateCounterpartyRequest): Promise<Counterparty> {
    return apiClient.patch<Counterparty>(
      API_ENDPOINTS.COUNTERPARTIES.UPDATE(id),
      data
    );
  },

  /**
   * Delete counterparty
   */
  async deleteCounterparty(id: string): Promise<void> {
    return apiClient.delete(
      API_ENDPOINTS.COUNTERPARTIES.DELETE(id)
    );
  },

  /**
   * Get documents for counterparty
   */
  async getCounterpartyDocuments(id: string): Promise<Document[]> {
    const response = await apiClient.get<DocumentListResponse>(
      API_ENDPOINTS.COUNTERPARTIES.DOCUMENTS(id)
    );
    return response.items;
  },

  /**
   * Search counterparties
   */
  async searchCounterparties(query: string): Promise<Counterparty[]> {
    const response = await this.getCounterparties({ search: query });
    return response.items;
  },
};


