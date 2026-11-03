import { createContext, useContext } from 'react';
import type { ChatConnection, ChatEvent, Conversation, CreateConversation, ReadReceipt } from '../../types/chat';

export interface ChatContextValue {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  connection: ChatConnection;
  refreshInbox: () => Promise<void>;
  ensureConversation: (id: string) => Promise<Conversation>;
  createConversation: (body: CreateConversation) => Promise<Conversation>;
  subscribe: (listener: (event: ChatEvent) => void) => () => void;
  notifyRead: (receipt: ReadReceipt) => void;
  typing: (id: string, active: boolean) => void;
  reconnect: () => void;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('ChatProvider is required');
  return value;
}
