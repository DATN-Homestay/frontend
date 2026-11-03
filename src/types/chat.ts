import type { UserRole } from './auth';

export type ConversationType = 'CUSTOMER_HOST' | 'CUSTOMER_ADMIN' | 'HOST_ADMIN';
export type ChatConnection = 'connecting' | 'connected' | 'offline' | 'error';

export interface ChatContact {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: UserRole;
  content: string;
  client_message_id: string | null;
  is_read: number;
  read_at: string | null;
  created_at: string;
  delivery?: 'sending' | 'failed' | 'sent';
  failure?: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  customer_id: string | null;
  host_id: string | null;
  admin_id: string | null;
  homestay: { id: string; name: string } | null;
  participants: ChatContact[];
  partner: ChatContact | null;
  last_message: Pick<ChatMessage, 'id' | 'sender_id' | 'content' | 'created_at'> | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface CreateConversation {
  type?: ConversationType;
  recipient_id?: string;
  homestay_id?: string;
  as_role?: UserRole;
}

export interface ChatPageResult<T> {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  conversations?: T[];
  contacts?: T[];
}

export interface MessagePage {
  messages: ChatMessage[];
  has_more: boolean;
  next_before_id: string | null;
}

export interface ReadReceipt {
  conversation_id: string;
  reader_id: string;
  up_to_message_id: string | null;
  read_at: string;
  updated_count: number;
}

export interface TypingEvent {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

export type ChatEvent =
  | { type: 'message'; data: ChatMessage }
  | { type: 'read'; data: ReadReceipt }
  | { type: 'typing'; data: TypingEvent }
  | { type: 'reconnected' };
