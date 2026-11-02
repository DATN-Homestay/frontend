import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { chatService } from '../../services/chatService';
import type { ChatMessage, Conversation, MessagePage, ReadReceipt } from '../../types/chat';
import { useChat } from './ChatContext';
import { applyReadReceipt, chatError, compareIds, mergeMessages } from './chat.utils';

interface ThreadState {
  messages: ChatMessage[];
  loading: boolean;
  loadingOlder: boolean;
  loaded: boolean;
  hasMore: boolean;
  cursor: string | null;
  error: string | null;
  typing: boolean;
}
const EMPTY: ThreadState = { messages: [], loading: false, loadingOlder: false, loaded: false,
  hasMore: false, cursor: null, error: null, typing: false };
type Action =
  | { type: 'loading'; id: string; older: boolean }
  | { type: 'loaded'; id: string; older: boolean; data: MessagePage }
  | { type: 'error'; id: string; error: string }
  | { type: 'merge'; id: string; messages: ChatMessage[] }
  | { type: 'failed'; id: string; clientId: string; error: string }
  | { type: 'read'; id: string; receipt: ReadReceipt }
  | { type: 'typing'; id: string; active: boolean };

function reducer(state: Record<string, ThreadState>, action: Action): Record<string, ThreadState> {
  const thread = state[action.id] ?? EMPTY;
  let next = thread;
  switch (action.type) {
    case 'loading': next = { ...thread, loading: !action.older, loadingOlder: action.older, error: null }; break;
    case 'loaded': {
      const latest = action.data.messages.at(-1)?.id;
      const retained = action.older ? thread.messages : thread.messages.filter((m) => m.id.startsWith('local:') ||
        (latest && compareIds(m.id, latest) >= 0));
      // Merge cached versions for matching rows so an in-flight GET cannot undo a read receipt.
      const rows = mergeMessages(action.data.messages, thread.messages.filter((m) => action.data.messages.some((row) => row.id === m.id)));
      next = { ...thread, messages: mergeMessages(rows, retained), loaded: true, loading: false,
        loadingOlder: false, error: null, hasMore: action.data.has_more, cursor: action.data.next_before_id };
      break;
    }
    case 'error': next = { ...thread, error: action.error, loading: false, loadingOlder: false }; break;
    case 'merge': next = { ...thread, messages: mergeMessages(thread.messages, action.messages) }; break;
    case 'failed': next = { ...thread, messages: thread.messages.map((m) =>
      m.client_message_id === action.clientId && m.id.startsWith('local:')
        ? { ...m, delivery: 'failed', failure: action.error } : m) }; break;
    case 'read': next = { ...thread, messages: applyReadReceipt(thread.messages, action.receipt) }; break;
    case 'typing': next = { ...thread, typing: action.active }; break;
  }
  return { ...state, [action.id]: next };
}

export function useChatThread(conversation: Conversation | null) {
  const { user } = useAuth();
  const { subscribe, notifyRead, refreshInbox } = useChat();
  const [threads, dispatch] = useReducer(reducer, {});
  const sequences = useRef(new Map<string, number>());
  const pendingSends = useRef(new Set<string>());
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const id = conversation?.id;

  const load = useCallback(async (conversationId: string, beforeId?: string) => {
    const sequence = (sequences.current.get(conversationId) ?? 0) + 1;
    sequences.current.set(conversationId, sequence);
    dispatch({ type: 'loading', id: conversationId, older: Boolean(beforeId) });
    try {
      const data = await chatService.messages(conversationId, beforeId);
      if (sequences.current.get(conversationId) === sequence) dispatch({ type: 'loaded', id: conversationId, older: Boolean(beforeId), data });
    } catch (error) {
      if (sequences.current.get(conversationId) === sequence) dispatch({ type: 'error', id: conversationId, error: chatError(error) });
    }
  }, []);

  useEffect(() => {
    if (id) void load(id);
  }, [id, load]);

  useEffect(() => subscribe((event) => {
    if (event.type === 'message') dispatch({ type: 'merge', id: event.data.conversation_id, messages: [event.data] });
    if (event.type === 'read') dispatch({ type: 'read', id: event.data.conversation_id, receipt: event.data });
    if (event.type === 'reconnected' && id) void load(id);
    if (event.type === 'typing' && event.data.user_id !== user?.id) {
      const key = event.data.conversation_id;
      clearTimeout(typingTimers.current.get(key));
      dispatch({ type: 'typing', id: key, active: event.data.is_typing });
      if (event.data.is_typing) typingTimers.current.set(key,
        setTimeout(() => dispatch({ type: 'typing', id: key, active: false }), 4000));
    }
  }), [subscribe, id, load, user?.id]);

  useEffect(() => {
    const timers = typingTimers.current;
    return () => { for (const timer of timers.values()) clearTimeout(timer); };
  }, []);

  const send = useCallback(async (content: string, existing?: ChatMessage) => {
    if (!conversation || !user) return;
    const clientId = existing?.client_message_id ?? crypto.randomUUID();
    if (pendingSends.current.has(clientId)) return;
    pendingSends.current.add(clientId);
    const message: ChatMessage = { id: `local:${clientId}`, conversation_id: conversation.id,
      sender_id: user.id, sender_role: conversation.participants.find((p) => p.id === user.id)!.role,
      content: content.trim(), client_message_id: clientId, is_read: 0, read_at: null,
      created_at: existing?.created_at ?? new Date().toISOString(), delivery: 'sending' };
    dispatch({ type: 'merge', id: conversation.id, messages: [message] });
    try {
      const saved = await chatService.send(conversation.id, message.content, clientId);
      dispatch({ type: 'merge', id: conversation.id, messages: [saved] });
      void refreshInbox();
    } catch (error) {
      dispatch({ type: 'failed', id: conversation.id, clientId, error: chatError(error) });
    } finally { pendingSends.current.delete(clientId); }
  }, [conversation, user, refreshInbox]);

  const read = useCallback(async (boundary: string) => {
    if (!id) return;
    notifyRead(await chatService.read(id, boundary));
  }, [id, notifyRead]);

  const thread = id ? threads[id] ?? EMPTY : EMPTY;
  return { ...thread, send, read, reload: () => id ? load(id) : Promise.resolve(),
    loadOlder: () => id && thread.cursor ? load(id, thread.cursor) : Promise.resolve() };
}
