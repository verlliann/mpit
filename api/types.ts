import { Document, Counterparty, DocumentStatus, PriorityLevel, DocumentType } from '../types';

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
}

// Documents
export interface DocumentListParams {
  page?: number;
  limit?: number;
  status?: DocumentStatus;
  priority?: PriorityLevel;
  type?: DocumentType;
  search?: string;
  counterparty_id?: string;
  date_from?: string;
  date_to?: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  is_deleted?: boolean;
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateDocumentRequest {
  title: string;
  type: DocumentType;
  counterparty_id?: string;
  priority: PriorityLevel;
  department: string;
  description?: string;
  tags?: string[];
}

export interface UpdateDocumentRequest {
  title?: string;
  type?: DocumentType;
  counterparty_id?: string;
  priority?: PriorityLevel;
  department?: string;
  status?: DocumentStatus;
  description?: string;
  tags?: string[];
  is_favorite?: boolean;
  is_archived?: boolean;
}

export interface UploadDocumentResponse {
  document: Document;
  upload_url: string;
}

export interface BulkActionRequest {
  document_ids: string[];
}

// Counterparties
export interface CounterpartyListParams {
  page?: number;
  limit?: number;
  search?: string;
  min_trust_score?: number;
}

export interface CounterpartyListResponse {
  items: Counterparty[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateCounterpartyRequest {
  name: string;
  inn: string;
  kpp?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface UpdateCounterpartyRequest {
  name?: string;
  inn?: string;
  kpp?: string;
  address?: string;
  email?: string;
  phone?: string;
}

// Analytics
export interface DashboardMetrics {
  total_documents: number;
  high_priority_count: number;
  avg_processing_time_minutes: number;
  processed_pages: number;
  storage_used_gb: number;
  storage_total_gb: number;
}

export interface WorkflowData {
  name: string;
  incoming: number;
  processed: number;
}

export interface DocumentTypesData {
  name: string;
  value: number;
}

export interface DocumentsFlowData {
  name: string;
  docs: number;
}

// Chat
export interface SendMessageRequest {
  message: string;
  context?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

// Storage
export interface StorageInfo {
  total_gb: number;
  used_gb: number;
  available_gb: number;
  usage_percentage: number;
  bucket_name: string;
  region: string;
}

export interface StorageStats {
  by_type: Array<{
    type: string;
    size_gb: number;
    count: number;
  }>;
}

// Settings
export interface Settings {
  theme: 'light' | 'dark';
  compact_list: boolean;
  notifications_enabled: boolean;
  auto_archive_days: number;
  lifecycle_policy_enabled: boolean;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// Common
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ApiError is exported from './client' as a class, not an interface


