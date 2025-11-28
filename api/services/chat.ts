import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config';
import type {
  SendMessageRequest,
  ChatMessage,
  ChatHistoryResponse,
} from '../types';

export const chatService = {
  /**
   * Send message to AI assistant
   */
  async sendMessage(message: string, context?: string): Promise<ChatMessage> {
    const request: SendMessageRequest = { message, context };
    return apiClient.post<ChatMessage>(
      API_ENDPOINTS.CHAT.SEND_MESSAGE,
      request
    );
  },

  /**
   * Stream message response (for real-time typing effect)
   */
  async streamMessage(
    message: string,
    onChunk: (chunk: string) => void,
    onDocuments?: (documents: Array<any>) => void,
    context?: string
  ): Promise<void> {
    const url = `${apiClient['baseURL']}${API_ENDPOINTS.CHAT.STREAM}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({ message, context } as SendMessageRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              }
              if (parsed.documents && onDocuments) {
                onDocuments(parsed.documents);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  /**
   * Get chat history
   */
  async getHistory(limit?: number): Promise<ChatMessage[]> {
    const response = await apiClient.get<ChatHistoryResponse>(
      API_ENDPOINTS.CHAT.HISTORY,
      { params: { limit } }
    );
    return response.messages;
  },

  /**
   * Clear chat history
   */
  async clearHistory(): Promise<void> {
    return apiClient.delete(
      API_ENDPOINTS.CHAT.CLEAR
    );
  },
};


