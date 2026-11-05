import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyReadReceipt, chatDayKey, compareIds, conversationType, dateLabel, dayLabel, inboxTime, mergeMessages, parseChatDate, recipientRoles, searchable, sortConversations, timeLabel, timestampLabel } from '../src/features/chat/chat.utils.ts';
import type { ChatMessage, Conversation, ReadReceipt } from '../src/types/chat.ts';

const message = (patch: Partial<ChatMessage> = {}): ChatMessage => ({
  id: '9007199254740993', conversation_id: '1', sender_id: '2', sender_role: 'CUSTOMER', content: 'Xin chào',
  client_message_id: 'client-id-1', is_read: 0, read_at: null, created_at: '2026-11-02T03:00:00Z', ...patch,
});
const receipt: ReadReceipt = { conversation_id: '1', reader_id: '3', up_to_message_id: '9007199254740994',
  read_at: '2026-11-02T03:01:00Z', updated_count: 1 };

describe('Chat timestamps in Vietnam', () => {
  it('keeps persisted MySQL timestamps and optimistic ISO timestamps at the same time', () => {
    for (const value of ['2026-11-03 04:45:09.732283', '2026-11-03T04:45:09.732Z', '2026-11-03T11:45:09.732+07:00']) {
      assert.equal(parseChatDate(value)?.toISOString(), '2026-11-03T04:45:09.732Z');
      assert.equal(timeLabel(value), '11:45');
      assert.equal(timestampLabel(value), '11:45, 03/11/2026');
    }
  });
  it('groups messages and labels today/yesterday at Vietnam midnight', () => {
    const now = new Date('2026-11-03T17:05:00Z');
    assert.notEqual(chatDayKey('2026-11-03 16:59:00'), chatDayKey('2026-11-03 17:00:00'));
    assert.equal(dayLabel('2026-11-03 17:00:00', now), 'Hôm nay');
    assert.equal(dayLabel('2026-11-03 16:59:00', now), 'Hôm qua');
    assert.equal(inboxTime('2026-11-03 17:00:00', now), '00:00');
    assert.equal(inboxTime('2026-11-03 16:59:00', now), '03/11');
    assert.equal(dateLabel('2026-11-03 17:00:00'), '04/11/2026');
  });
  it('includes the year for old conversations and handles invalid values', () => {
    assert.equal(inboxTime('2025-01-01 00:00:00', new Date('2026-11-03T00:00:00Z')), '01/01/2025');
    assert.equal(timeLabel('invalid'), '—');
    assert.equal(chatDayKey(''), '');
    assert.equal(timestampLabel('invalid'), 'Chưa có thời gian');
  });
  it('sorts mixed MySQL and ISO inbox timestamps by the actual instant', () => {
    const old = { id: '1', created_at: '2026-11-03 04:00:00', last_message_at: null } as Conversation;
    const recent = { ...old, id: '2', created_at: '2026-11-03T04:01:00Z' };
    assert.deepEqual(sortConversations([old, recent]).map((item) => item.id), ['2', '1']);
  });
});

describe('Chat message reconciliation', () => {
  it('compares BIGINT IDs without Number precision loss', () => {
    assert.equal(compareIds('9007199254740992', '9007199254740993'), -1);
    assert.equal(compareIds('18446744073709551615', '9007199254740993'), 1);
  });
  it('replaces optimistic text with its persisted message when socket arrives before HTTP ACK', () => {
    const optimistic = message({ id: 'local:client-id-1', delivery: 'sending' });
    const socketResult = mergeMessages([optimistic], [message()]);
    const final = mergeMessages(socketResult, [message()]);
    assert.equal(final.length, 1);
    assert.equal(final[0].id, '9007199254740993');
    assert.equal(final[0].delivery, 'sent');
  });
  it('keeps read state when a delayed ACK contains an unread snapshot', () => {
    const viewed = applyReadReceipt([message()], receipt);
    assert.equal(mergeMessages(viewed, [message()])[0].is_read, 1);
    assert.equal(mergeMessages(viewed, [message()])[0].read_at, receipt.read_at);
  });
  it('does not merge two senders who choose the same client_message_id', () => {
    assert.equal(mergeMessages([message()], [message({ id: '9007199254740994', sender_id: '3' })]).length, 2);
  });
  it('does not let a pending retry replace an already persisted ID', () => {
    assert.equal(mergeMessages([message()], [message({ id: 'local:client-id-1', delivery: 'sending' })])[0].id, '9007199254740993');
  });
  it('marks only messages from the other person up to the read boundary', () => {
    const messages = [message(), message({ id: '9007199254740994', sender_id: '3', client_message_id: 'own' }),
      message({ id: '9007199254740995', client_message_id: 'future' }), message({ id: 'local:pending', client_message_id: 'pending' })];
    assert.deepEqual(applyReadReceipt(messages, receipt).map((m) => m.is_read), [1, 0, 0, 0]);
  });
  it('orders persisted messages by numeric ID even if realtime events arrive out of order', () => {
    const rows = mergeMessages([], [message({ id: '11', client_message_id: 'b' }), message({ id: '9', client_message_id: 'a' })]);
    assert.deepEqual(rows.map((m) => m.id), ['9', '11']);
  });
});

describe('Chat roles and inbox', () => {
  it('maps both conversation directions for all three role pairs', () => {
    for (const [a, b, type] of [['CUSTOMER', 'HOST', 'CUSTOMER_HOST'], ['CUSTOMER', 'ADMIN', 'CUSTOMER_ADMIN'], ['HOST', 'ADMIN', 'HOST_ADMIN']] as const) {
      assert.equal(conversationType(a, b), type); assert.equal(conversationType(b, a), type);
    }
  });
  it('rejects a same-role conversation', () => assert.throws(() => conversationType('HOST', 'HOST')));
  it('offers the correct recipients in each portal', () => {
    assert.deepEqual(recipientRoles('CUSTOMER'), ['HOST', 'ADMIN']);
    assert.deepEqual(recipientRoles('HOST'), ['CUSTOMER', 'ADMIN']);
    assert.deepEqual(recipientRoles('ADMIN'), ['CUSTOMER', 'HOST']);
  });
  it('finds Vietnamese names with or without diacritics', () => assert.equal(searchable('Đà Lạt · Nguyễn Hoàng Nam'), 'da lat · nguyen hoang nam'));
  it('sorts same-time conversations with BIGINT IDs correctly', () => {
    const a = { id: '9007199254740992', created_at: '2026-11-02T03:00:00Z', last_message_at: null } as Conversation;
    const b = { ...a, id: '9007199254740993' };
    assert.deepEqual(sortConversations([a, b]).map((c) => c.id), [b.id, a.id]);
  });
});
