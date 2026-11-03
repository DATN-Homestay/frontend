import { apiClient, type ApiResponse } from './apiClient';
import type { UserRole } from '../types/auth';
import type { ChatContact, ChatMessage, ChatPageResult, Conversation, CreateConversation, MessagePage, ReadReceipt } from '../types/chat';

export const chatService = {
  async conversations(page = 1, signal?: AbortSignal) {
    const res = await apiClient<ApiResponse<ChatPageResult<Conversation>>>('/chat/conversations', {
      params: { page, limit: 100 }, signal,
    });
    return res.data;
  },
  async conversation(id: string) {
    return (await apiClient<ApiResponse<Conversation>>(`/chat/conversations/${encodeURIComponent(id)}`)).data;
  },
  async create(body: CreateConversation) {
    return (await apiClient<ApiResponse<Conversation & { created: boolean }>>('/chat/conversations', {
      method: 'POST', body: JSON.stringify(body),
    })).data;
  },
  async contacts(role: UserRole, search: string, page = 1, signal?: AbortSignal) {
    return (await apiClient<ApiResponse<ChatPageResult<ChatContact>>>('/chat/contacts', {
      params: { role, search: search.trim() || undefined, page, limit: 20 }, signal,
    })).data;
  },
  async messages(id: string, beforeId?: string) {
    return (await apiClient<ApiResponse<MessagePage>>(`/chat/conversations/${encodeURIComponent(id)}/messages`, {
      params: { limit: 30, before_id: beforeId },
    })).data;
  },
  async send(id: string, content: string, clientMessageId: string) {
    return (await apiClient<ApiResponse<ChatMessage>>(`/chat/conversations/${encodeURIComponent(id)}/messages`, {
      method: 'POST', body: JSON.stringify({ content, client_message_id: clientMessageId }),
    })).data;
  },
  async read(id: string, upToMessageId: string) {
    return (await apiClient<ApiResponse<ReadReceipt>>(`/chat/conversations/${encodeURIComponent(id)}/read`, {
      method: 'PATCH', body: JSON.stringify({ up_to_message_id: upToMessageId }),
    })).data;
  },
};
