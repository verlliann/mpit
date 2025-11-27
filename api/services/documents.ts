import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config';
import type { Document } from '../../types';
import type {
  DocumentListParams,
  DocumentListResponse,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  UploadDocumentResponse,
  BulkActionRequest,
} from '../types';

export const documentsService = {
  /**
   * Get list of documents with filters
   */
  async getDocuments(params?: DocumentListParams): Promise<DocumentListResponse> {
    return apiClient.get<DocumentListResponse>(
      API_ENDPOINTS.DOCUMENTS.LIST,
      { params }
    );
  },

  /**
   * Get single document by ID
   */
  async getDocument(id: string): Promise<Document> {
    return apiClient.get<Document>(
      API_ENDPOINTS.DOCUMENTS.GET(id)
    );
  },

  /**
   * Create new document (metadata only)
   */
  async createDocument(data: CreateDocumentRequest): Promise<Document> {
    return apiClient.post<Document>(
      API_ENDPOINTS.DOCUMENTS.CREATE,
      data
    );
  },

  /**
   * Update document metadata
   */
  async updateDocument(id: string, data: UpdateDocumentRequest): Promise<Document> {
    return apiClient.patch<Document>(
      API_ENDPOINTS.DOCUMENTS.UPDATE(id),
      data
    );
  },

  /**
   * Delete document (move to trash)
   */
  async deleteDocument(id: string): Promise<void> {
    return apiClient.delete(
      API_ENDPOINTS.DOCUMENTS.DELETE(id)
    );
  },

  /**
   * Upload document file
   */
  async uploadDocument(file: File, metadata?: Partial<CreateDocumentRequest>): Promise<UploadDocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      });
    }

    return apiClient.upload<UploadDocumentResponse>(
      API_ENDPOINTS.DOCUMENTS.UPLOAD,
      formData
    );
  },

  /**
   * Upload multiple documents
   */
  async uploadMultipleDocuments(files: File[]): Promise<UploadDocumentResponse[]> {
    const uploads = files.map(file => this.uploadDocument(file));
    return Promise.all(uploads);
  },

  /**
   * Download document file
   */
  async downloadDocument(id: string): Promise<Blob> {
    return apiClient.download(
      API_ENDPOINTS.DOCUMENTS.DOWNLOAD(id)
    );
  },

  /**
   * Search documents
   */
  async searchDocuments(query: string, params?: DocumentListParams): Promise<DocumentListResponse> {
    return apiClient.get<DocumentListResponse>(
      API_ENDPOINTS.DOCUMENTS.SEARCH,
      { params: { query, ...params } }
    );
  },

  /**
   * Get favorite documents
   */
  async getFavorites(params?: DocumentListParams): Promise<DocumentListResponse> {
    return this.getDocuments({ ...params, is_favorite: true });
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string, isFavorite: boolean): Promise<Document> {
    return this.updateDocument(id, { is_favorite: isFavorite });
  },

  /**
   * Get archived documents
   */
  async getArchived(params?: DocumentListParams): Promise<DocumentListResponse> {
    return this.getDocuments({ ...params, is_archived: true });
  },

  /**
   * Archive document
   */
  async archiveDocument(id: string): Promise<Document> {
    return this.updateDocument(id, { is_archived: true });
  },

  /**
   * Get trash documents
   */
  async getTrash(params?: DocumentListParams): Promise<DocumentListResponse> {
    return this.getDocuments({ ...params, is_deleted: true });
  },

  /**
   * Restore document from trash
   */
  async restoreDocument(id: string): Promise<Document> {
    return apiClient.post<Document>(
      API_ENDPOINTS.DOCUMENTS.RESTORE(id)
    );
  },

  /**
   * Permanently delete document
   */
  async permanentlyDelete(id: string): Promise<void> {
    return apiClient.delete(
      API_ENDPOINTS.DOCUMENTS.DELETE(id),
      { params: { permanent: true } }
    );
  },

  /**
   * Bulk delete documents
   */
  async bulkDelete(documentIds: string[]): Promise<void> {
    return apiClient.post(
      API_ENDPOINTS.DOCUMENTS.BULK_DELETE,
      { document_ids: documentIds } as BulkActionRequest
    );
  },

  /**
   * Bulk archive documents
   */
  async bulkArchive(documentIds: string[]): Promise<void> {
    return apiClient.post(
      API_ENDPOINTS.DOCUMENTS.BULK_ARCHIVE,
      { document_ids: documentIds } as BulkActionRequest
    );
  },

  /**
   * Add tag to document
   */
  async addTag(id: string, tag: string): Promise<Document> {
    const doc = await this.getDocument(id);
    const tags = [...(doc.tags || []), tag];
    return this.updateDocument(id, { tags });
  },

  /**
   * Remove tag from document
   */
  async removeTag(id: string, tag: string): Promise<Document> {
    const doc = await this.getDocument(id);
    const tags = (doc.tags || []).filter(t => t !== tag);
    return this.updateDocument(id, { tags });
  },
};


