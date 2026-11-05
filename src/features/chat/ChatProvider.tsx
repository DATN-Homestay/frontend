import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../../contexts/useAuth';
import { apiClient } from '../../services/apiClient';
import { tokenStorage } from '../../services/tokenStorage';
import { chatService } from '../../services/chatService';
import type { ChatConnection, ChatEvent, ChatMessage, Conversation, CreateConversation, ReadReceipt, TypingEvent } from '../../types/chat';
import { ChatContext } from './ChatContext';
import { chatError, compareIds, sortConversations } from './chat.utils';

export default function ChatProvider({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  return <ChatSession key={`${user?.id ?? 'guest'}:${initializing}`} userId={initializing ? null : user?.id ?? null}>{children}</ChatSession>;
}

function ChatSession({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ChatConnection>('connecting');
  const socketRef = useRef<Socket | null>(null);
  const listeners = useRef(new Set<(event: ChatEvent) => void>());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seenMessages = useRef(new Set<string>());
  const readBoundaries = useRef(new Map<string, string>());
  const refreshJob = useRef<Promise<void> | null>(null);
  const refreshAgain = useRef(false);
  const alive = useRef(true);
  const requestAbort = useRef<AbortController | null>(null);
  const isRevokedRef = useRef(false);

  const publish = useCallback((event: ChatEvent) => {
    for (const listener of listeners.current) listener(event);
  }, []);

  const refreshInbox = useCallback(async () => {
    if (!userId || isRevokedRef.current || (window as any).__SESSION_REVOKED__) return;
    if (refreshJob.current) { refreshAgain.current = true; return refreshJob.current; }
    refreshJob.current = (async () => {
      do {
        refreshAgain.current = false;
        const controller = new AbortController();
        requestAbort.current = controller;
        try {
          const rows: Conversation[] = [];
          let page = 1;
          let hasMore = true;
          while (hasMore && alive.current) {
            const result = await chatService.conversations(page++, controller.signal);
            rows.push(...result.conversations ?? []);
            hasMore = result.has_more;
          }
          if (alive.current) { setConversations(sortConversations(rows)); setError(null); }
        } catch (err) {
          if (alive.current && !controller.signal.aborted) setError(chatError(err));
        } finally { if (alive.current) setLoading(false); }
      } while (refreshAgain.current && alive.current);
    })().finally(() => { refreshJob.current = null; });
    return refreshJob.current;
  }, [userId]);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void refreshInbox(), 300);
  }, [refreshInbox]);

  const ensureConversation = useCallback(async (id: string) => {
    const conversation = await chatService.conversation(id);
    if (alive.current) setConversations((current) => sortConversations([...current.filter((c) => c.id !== id), conversation]));
    return conversation;
  }, []);

  const createConversation = useCallback(async (body: CreateConversation) => {
    const conversation = await chatService.create(body);
    if (alive.current) setConversations((current) => sortConversations([...current.filter((c) => c.id !== conversation.id), conversation]));
    return conversation;
  }, []);

  const notifyRead = useCallback((receipt: ReadReceipt) => {
    publish({ type: 'read', data: receipt });
    if (receipt.reader_id !== userId || !receipt.up_to_message_id) return;
    const previous = readBoundaries.current.get(receipt.conversation_id);
    if (previous && compareIds(previous, receipt.up_to_message_id) >= 0) return;
    readBoundaries.current.set(receipt.conversation_id, receipt.up_to_message_id);
    setConversations((current) => current.map((c) => c.id === receipt.conversation_id ? {
      ...c, unread_count: !c.last_message || compareIds(c.last_message.id, receipt.up_to_message_id!) <= 0
        ? 0 : Math.max(0, c.unread_count - receipt.updated_count),
    } : c));
    scheduleRefresh();
  }, [publish, scheduleRefresh, userId]);

  useEffect(() => {
    alive.current = true;
    if (!userId) return;
    void refreshInbox();
    const socket = io(`${(import.meta.env.VITE_API_URL ?? window.location.origin).replace(/\/$/, '')}/chat`, {
      auth: (callback) => callback({ token: tokenStorage.getAccessToken() }),
      reconnectionDelay: 1000, reconnectionDelayMax: 10000, autoConnect: false,
    });
    socketRef.current = socket;
    let recovering = false;
    let connectedOnce = false;
    let authenticatedToken = tokenStorage.getAccessToken();
    const recoverSession = async () => {
      if (recovering || !alive.current || isRevokedRef.current || (window as any).__SESSION_REVOKED__) return;
      recovering = true;
      try {
        // Reuses apiClient's single-flight refresh; never rotates refresh tokens independently.
        await apiClient('/auth/me');
        if (alive.current && tokenStorage.getAccessToken() && tokenStorage.getAccessToken() !== authenticatedToken) socket.connect();
        else if (alive.current) setConnection('error');
      } catch { if (alive.current) setConnection('error'); }
      finally { recovering = false; }
    };
    socket.on('connect', () => {
      authenticatedToken = tokenStorage.getAccessToken();
      setConnection('connected');
      void refreshInbox();
      if (connectedOnce) publish({ type: 'reconnected' });
      connectedOnce = true;
    });
    socket.on('connect_error', (err: Error) => {
      setConnection('offline');
      if (err.message.includes('Không thể xác thực')) void recoverSession();
    });
    socket.on('disconnect', (reason) => {
      setConnection('offline');
      if (reason === 'io server disconnect') void recoverSession();
    });
    socket.io.on('reconnect_attempt', () => setConnection('connecting'));
    socket.on('receive_message', (message: ChatMessage) => {
      publish({ type: 'message', data: message });
      if (seenMessages.current.has(message.id)) return;
      if (seenMessages.current.size > 5000) seenMessages.current.clear();
      seenMessages.current.add(message.id);
      setConversations((current) => sortConversations(current.map((c) => {
        if (c.id !== message.conversation_id || (c.last_message && compareIds(c.last_message.id, message.id) >= 0)) return c;
        return { ...c, last_message: message, last_message_at: message.created_at,
          unread_count: c.unread_count + (message.sender_id === userId ? 0 : 1) };
      })));
      scheduleRefresh();
    });
    socket.on('messages_read', notifyRead);
    socket.on('user_typing', (data: TypingEvent) => publish({ type: 'typing', data }));
    socket.on('conversation_created', scheduleRefresh);
    socket.on('session_revoked', (data: unknown) => {
      isRevokedRef.current = true;
      (window as any).__SESSION_REVOKED__ = true;
      socket.disconnect();
      window.dispatchEvent(new CustomEvent('auth:session_revoked', { detail: data }));
    });
    const onOnline = () => {
      if (isRevokedRef.current || (window as any).__SESSION_REVOKED__) return;
      socket.connect();
      void refreshInbox();
    };
    const onVisible = () => {
      if (isRevokedRef.current || (window as any).__SESSION_REVOKED__) return;
      if (document.visibilityState === 'visible') {
        void refreshInbox();
        if (!socket.connected) socket.connect();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'access_token' && event.newValue) {
        if (event.newValue !== authenticatedToken) {
          isRevokedRef.current = true;
          (window as any).__SESSION_REVOKED__ = true;
          socket.disconnect();
          window.dispatchEvent(
            new CustomEvent('auth:session_revoked', {
              detail: {
                reason: 'REMOTE_LOGIN',
                message: 'Tài khoản của bạn vừa được đăng nhập trên một cửa sổ hoặc thiết bị khác.',
                revoked_at: new Date().toISOString(),
              },
            }),
          );
        }
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    socket.connect();
    return () => {
      alive.current = false;
      requestAbort.current?.abort();
      clearTimeout(refreshTimer.current);
      socket.removeAllListeners();
      socket.disconnect();
      socket.io.removeAllListeners();
      socketRef.current = null;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [notifyRead, publish, refreshInbox, scheduleRefresh, userId]);

  const subscribe = useCallback((listener: (event: ChatEvent) => void) => {
    listeners.current.add(listener);
    return () => { listeners.current.delete(listener); };
  }, []);
  const typing = useCallback((id: string, active: boolean) => {
    if (socketRef.current?.connected) socketRef.current.emit('typing', { conversation_id: id, is_typing: active });
  }, []);
  const reconnect = useCallback(() => { socketRef.current?.connect(); void refreshInbox(); }, [refreshInbox]);
  const value = useMemo(() => ({ conversations, loading, error, connection, refreshInbox, ensureConversation,
    createConversation, subscribe, notifyRead, typing, reconnect }),
  [conversations, loading, error, connection, refreshInbox, ensureConversation, createConversation, subscribe, notifyRead, typing, reconnect]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
