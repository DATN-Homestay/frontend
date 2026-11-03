import type { UserRole } from '../../types/auth';
import type { ChatMessage, Conversation, ConversationType, ReadReceipt } from '../../types/chat';

export const ROLE_LABEL: Record<UserRole, string> = { CUSTOMER: 'Khách hàng', HOST: 'Chủ nhà', ADMIN: 'Hỗ trợ StayAI' };

export function recipientRoles(role: UserRole): UserRole[] {
  return role === 'ADMIN' ? ['CUSTOMER', 'HOST'] : role === 'HOST' ? ['CUSTOMER', 'ADMIN'] : ['HOST', 'ADMIN'];
}

export function conversationType(actor: UserRole, recipient: UserRole): ConversationType {
  if (actor === recipient) throw new Error('Hai bên phải có vai trò khác nhau');
  const roles = [actor, recipient];
  if (!roles.includes('ADMIN')) return 'CUSTOMER_HOST';
  return roles.includes('HOST') ? 'HOST_ADMIN' : 'CUSTOMER_ADMIN';
}

export function compareIds(a: string, b: string): number {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) return BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
  return a.localeCompare(b);
}

export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const merged = [...current];
  for (const message of incoming) {
    const index = merged.findIndex((old) => old.id === message.id ||
      (message.client_message_id && old.client_message_id === message.client_message_id && old.sender_id === message.sender_id));
    if (index < 0) { merged.push(message); continue; }
    const old = merged[index];
    // A delayed HTTP ACK must not undo a read receipt or replace a persisted ID.
    const persisted = !old.id.startsWith('local:') && message.id.startsWith('local:') ? old : message;
    merged[index] = { ...old, ...persisted, is_read: old.is_read || message.is_read,
      read_at: old.read_at ?? message.read_at,
      delivery: persisted.id.startsWith('local:') ? persisted.delivery : 'sent', failure: undefined };
  }
  return merged.sort((a, b) => {
    const aPending = a.id.startsWith('local:');
    const bPending = b.id.startsWith('local:');
    if (!aPending && !bPending) return compareIds(a.id, b.id);
    return Date.parse(a.created_at) - Date.parse(b.created_at) || (aPending ? 1 : -1);
  });
}

export function applyReadReceipt(messages: ChatMessage[], receipt: ReadReceipt): ChatMessage[] {
  if (!receipt.up_to_message_id) return messages;
  return messages.map((message) => !message.id.startsWith('local:') && message.sender_id !== receipt.reader_id &&
    compareIds(message.id, receipt.up_to_message_id!) <= 0
    ? { ...message, is_read: 1, read_at: message.read_at ?? receipt.read_at } : message);
}

export function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) =>
    Date.parse(b.last_message_at ?? b.created_at) - Date.parse(a.last_message_at ?? a.created_at) || compareIds(b.id, a.id));
}

export function searchable(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

export function chatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể tải tin nhắn. Vui lòng thử lại.';
}

export function timeLabel(value: string): string {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  today.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function inboxTime(value: string): string {
  return new Date(value).toDateString() === new Date().toDateString() ? timeLabel(value)
    : new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
