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
    return (parseChatDate(a.created_at)?.getTime() ?? 0) - (parseChatDate(b.created_at)?.getTime() ?? 0) || (aPending ? 1 : -1);
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
    (parseChatDate(b.last_message_at ?? b.created_at)?.getTime() ?? 0) -
    (parseChatDate(a.last_message_at ?? a.created_at)?.getTime() ?? 0) || compareIds(b.id, a.id));
}

export function searchable(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

export function chatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể tải tin nhắn. Vui lòng thử lại.';
}

const CHAT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const clock = new Intl.DateTimeFormat('vi-VN', {
  timeZone: CHAT_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const calendar = new Intl.DateTimeFormat('vi-VN', {
  timeZone: CHAT_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
});
const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHAT_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
});

/** MySQL chat TIMESTAMP strings are UTC; ISO values already carry their offset. */
export function parseChatDate(value: string): Date | null {
  let normalized = value.trim().replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1');
  if (!normalized) return null;
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)) normalized += 'Z';
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function chatDayKey(value: string): string {
  const date = parseChatDate(value);
  return date ? dayKey.format(date) : '';
}

export function timeLabel(value: string): string {
  const date = parseChatDate(value);
  return date ? clock.format(date) : '—';
}

export function dateLabel(value: string): string {
  const date = parseChatDate(value);
  return date ? calendar.format(date) : '—';
}

export function timestampLabel(value: string): string {
  return parseChatDate(value) ? `${timeLabel(value)}, ${dateLabel(value)}` : 'Chưa có thời gian';
}

export function dayLabel(value: string, now = new Date()): string {
  const key = chatDayKey(value);
  if (!key) return 'Chưa có thời gian';
  if (key === dayKey.format(now)) return 'Hôm nay';
  if (key === dayKey.format(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return 'Hôm qua';
  return dateLabel(value);
}

export function inboxTime(value: string, now = new Date()): string {
  const date = parseChatDate(value);
  if (!date) return '—';
  if (chatDayKey(value) === dayKey.format(now)) return timeLabel(value);
  const parts = calendar.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const currentYear = calendar.formatToParts(now).find((part) => part.type === 'year')?.value;
  return year === currentYear ? dateLabel(value).replace(/\/\d{4}$/, '') : dateLabel(value);
}
