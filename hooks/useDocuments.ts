import { useCallback } from 'react';
import { documentsService } from '../api';
import { useApi, useMutation } from './useApi';
import type { Document } from '../types';
import type { DocumentListParams, UpdateDocumentRequest } from '../api/types';

/**
 * Hook for fetching documents list
 */
export function useDocuments(params?: DocumentListParams) {
  return useApi(
    () => documentsService.getDocuments(params),
    { immediate: true }
  );
}

/**
 * Hook for fetching single document
 */
export function useDocument(id: string | null) {
  return useApi(
    () => id ? documentsService.getDocument(id) : Promise.resolve(null),
    { immediate: !!id }
  );
}

/**
 * Hook for document mutations
 */
export function useDocumentMutations(options?: {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}) {
  const uploadMutation = useMutation(
    (file: File) => documentsService.uploadDocument(file),
    options
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: UpdateDocumentRequest }) =>
      documentsService.updateDocument(id, data),
    options
  );

  const deleteMutation = useMutation(
    (id: string) => documentsService.deleteDocument(id),
    options
  );

  const toggleFavoriteMutation = useMutation(
    ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      documentsService.toggleFavorite(id, isFavorite),
    options
  );

  const bulkDeleteMutation = useMutation(
    (ids: string[]) => documentsService.bulkDelete(ids),
    options
  );

  const bulkArchiveMutation = useMutation(
    (ids: string[]) => documentsService.bulkArchive(ids),
    options
  );

  return {
    upload: uploadMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    toggleFavorite: toggleFavoriteMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    bulkArchive: bulkArchiveMutation.mutate,
    isLoading:
      uploadMutation.loading ||
      updateMutation.loading ||
      deleteMutation.loading ||
      toggleFavoriteMutation.loading ||
      bulkDeleteMutation.loading ||
      bulkArchiveMutation.loading,
  };
}

/**
 * Hook for document upload with progress
 */
export function useDocumentUpload() {
  const { mutate, loading, error } = useMutation(
    (files: File[]) => documentsService.uploadMultipleDocuments(files)
  );

  const upload = useCallback(
    async (files: File[], onProgress?: (progress: number) => void) => {
      const total = files.length;
      let completed = 0;

      const results = [];
      for (const file of files) {
        const result = await documentsService.uploadDocument(file);
        results.push(result);
        completed++;
        onProgress?.(Math.round((completed / total) * 100));
      }

      return results;
    },
    []
  );

  return {
    upload,
    loading,
    error,
  };
}


