
export type DocumentType = 'contract' | 'invoice' | 'act' | 'order' | 'email' | 'scan';
export type DocumentStatus = 'processed' | 'processing' | 'review' | 'error';
export type PriorityLevel = 'high' | 'medium' | 'low';

export interface DocumentHistory {
  id: string;
  date: string;
  user: string;
  action: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  details?: string;
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  counterparty: string;
  date: string; // ISO date
  priority: PriorityLevel;
  pages: number;
  department: string;
  status: DocumentStatus;
  size: string;
  uploadedBy: string;
  path: string;
  version: number;
  description?: string;
  history: DocumentHistory[];
  isFavorite?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  tags?: string[];
}

export interface Counterparty {
  id: string;
  name: string;
  inn: string;
  kpp?: string;
  address: string;
  email: string;
  phone: string;
  docCount: number;
  trustScore: number; // 0-100
  activeContracts: number;
  lastInteraction: string;
  type: ('contract' | 'invoice' | 'act')[];
}

export interface Metric {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  status?: 'neutral' | 'good' | 'bad';
}

export type ViewState = 'dashboard' | 'library' | 'upload' | 'counterparties' | 'settings' | 'chat' | 'favorites' | 'archive' | 'trash' | 'analytics';
export type ViewMode = 'list' | 'grid';
