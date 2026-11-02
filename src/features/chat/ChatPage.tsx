import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Avatar, Badge, Button, Input, Skeleton, Spin, Tooltip } from 'antd';
import {
  ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined, CloseOutlined,
  CustomerServiceOutlined, HomeOutlined, InfoCircleOutlined, LoadingOutlined,
  MessageOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SendOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import type { UserRole } from '../../types/auth';
import type { ChatMessage, Conversation } from '../../types/chat';
import { useChat } from './ChatContext';
import { useChatThread } from './useChatThread';
import NewConversationModal from './NewConversationModal';
import { chatError, dayLabel, inboxTime, ROLE_LABEL, searchable, timeLabel } from './chat.utils';
import './ChatPage.css';

const FILTER_LABEL: Record<UserRole, string> = { CUSTOMER: 'Khách hàng', HOST: 'Chủ nhà', ADMIN: 'Hỗ trợ' };
const CONNECTION_LABEL = { connected: 'Đã kết nối', connecting: 'Đang kết nối', offline: 'Mất kết nối', error: 'Cần kết nối lại' };

function PersonAvatar({ person, size = 44 }: { person: Conversation['partner']; size?: number }) {
  return <Avatar size={size} src={person?.avatar_url} icon={person?.role === 'ADMIN' ? <CustomerServiceOutlined /> : <UserOutlined />}
    className={`chat-avatar chat-avatar--${person?.role.toLowerCase() ?? 'customer'}`} />;
}

function MessageBubble({ message, mine, onRetry }: { message: ChatMessage; mine: boolean; onRetry: () => void }) {
  const status = message.delivery === 'sending' ? 'Đang gửi' : message.delivery === 'failed' ? 'Chưa gửi được'
    : message.is_read ? 'Đã xem' : 'Đã gửi';
  return <div className={`chat-message ${mine ? 'is-mine' : ''} ${message.delivery === 'failed' ? 'is-failed' : ''}`}>
    <div className="chat-bubble">{message.content}</div>
    <div className="chat-message-meta">
      <time dateTime={message.created_at}>{timeLabel(message.created_at)}</time>
      {mine && <span className={message.is_read ? 'chat-read-status' : ''}>
        {message.delivery === 'sending' ? <LoadingOutlined /> : message.delivery !== 'failed' ? <CheckOutlined /> : null} {status}
      </span>}
    </div>
    {mine && message.delivery === 'failed' && <Tooltip title={message.failure}>
      <button className="chat-retry-send" onClick={onRetry}><ReloadOutlined /> Gửi lại tin nhắn</button>
    </Tooltip>}
  </div>;
}

export default function ChatPage({ portalRole }: { portalRole: UserRole }) {
  const { user } = useAuth();
  const { conversations, loading, error, connection, refreshInbox, ensureConversation, createConversation, typing, reconnect } = useChat();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('conversation');
  const homestayId = params.get('homestay');
  const role = user?.roles.includes(portalRole) ? portalRole : user?.roles.includes('ADMIN') ? 'ADMIN'
    : user?.roles.includes('HOST') ? 'HOST' : 'CUSTOMER';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserRole | 'ALL'>('ALL');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectionError, setSelectionError] = useState<{ id: string; message: string } | null>(null);
  const [selectionRetry, setSelectionRetry] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [atBottom, setAtBottom] = useState(true);
  const [visible, setVisible] = useState(document.visibilityState === 'visible');
  const [readRetry, setReadRetry] = useState(0);
  const [readError, setReadError] = useState(false);
  const feed = useRef<HTMLDivElement>(null);
  const shouldStick = useRef(true);
  const scrollAnchor = useRef<{ top: number; height: number } | null>(null);
  const scrolledConversation = useRef<string | null>(null);
  const readBoundary = useRef<string | null>(null);
  const typingThrottle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const homestayRequests = useRef(new Map<string, Promise<Conversation>>());
  const active = conversations.find((c) => c.id === selectedId) ?? null;
  const thread = useChatThread(active);
  const { loaded: threadLoaded, loading: messagesLoading, messages, read: markRead } = thread;
  const inbox = conversations.filter((c) => c.participants.some((p) => p.id === user?.id && p.role === role));
  const unread = inbox.reduce((count, c) => count + c.unread_count, 0);
  const searchTerm = searchable(query.trim());
  const filtered = inbox.filter((c) => (filter === 'ALL' || c.partner?.role === filter) && (!onlyUnread || c.unread_count > 0) &&
    searchable(`${c.partner?.full_name ?? ''} ${c.homestay?.name ?? ''} ${c.last_message?.content ?? ''}`).includes(searchTerm));
  const targetRoles = role === 'ADMIN' ? ['CUSTOMER', 'HOST'] as const : role === 'HOST' ? ['CUSTOMER', 'ADMIN'] as const : ['HOST', 'ADMIN'] as const;
  const draft = selectedId ? drafts[selectedId] ?? '' : '';
  const currentError = selectedId && !/^[1-9]\d{0,19}$/.test(selectedId) ? 'Đường dẫn hội thoại không hợp lệ.'
    : selectionError?.id === (homestayId ?? selectedId) ? selectionError.message : null;

  useEffect(() => {
    if (!selectedId || !/^[1-9]\d{0,19}$/.test(selectedId)) return;
    let cancelled = false;
    void ensureConversation(selectedId).catch((err) => {
      if (!cancelled) setSelectionError({ id: selectedId, message: chatError(err) });
    });
    return () => { cancelled = true; };
  }, [selectedId, ensureConversation, selectionRetry]);

  useEffect(() => {
    if (!homestayId) return;
    let cancelled = false;
    const key = `${role}:${homestayId}:${selectionRetry}`;
    let request = homestayRequests.current.get(key);
    if (!request) {
      request = createConversation({ homestay_id: homestayId, as_role: role });
      homestayRequests.current.set(key, request);
    }
    void request.then((conversation) => {
      if (!cancelled) setParams({ conversation: conversation.id }, { replace: true });
    }).catch((err) => { if (!cancelled) setSelectionError({ id: homestayId, message: chatError(err) }); });
    return () => { cancelled = true; };
  }, [homestayId, role, createConversation, setParams, selectionRetry]);

  useEffect(() => {
    const onVisible = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const id = selectedId;
    return () => { clearTimeout(stopTypingTimer.current); clearTimeout(typingThrottle.current); typingThrottle.current = undefined; if (id) typing(id, false); };
  }, [selectedId, typing]);

  useLayoutEffect(() => {
    const element = feed.current;
    if (!element || !selectedId || !thread.loaded) return;
    if (scrollAnchor.current && !thread.loadingOlder) {
      element.scrollTop = scrollAnchor.current.top + element.scrollHeight - scrollAnchor.current.height;
      scrollAnchor.current = null;
    } else if (scrolledConversation.current !== selectedId || shouldStick.current) {
      element.scrollTop = element.scrollHeight;
      scrolledConversation.current = selectedId;
    }
  }, [selectedId, thread.messages, thread.loaded, thread.loadingOlder, thread.typing]);

  useEffect(() => {
    if (!selectedId || !threadLoaded || messagesLoading || !atBottom || !visible) return;
    const boundary = messages.filter((m) => !m.id.startsWith('local:')).at(-1);
    if (!boundary || !messages.some((m) => m.sender_id !== user?.id && !m.is_read)) return;
    const key = `${selectedId}:${boundary.id}:${readRetry}`;
    if (readBoundary.current === key) return;
    readBoundary.current = key;
    void markRead(boundary.id).then(() => setReadError(false)).catch(() => setReadError(true));
  }, [selectedId, threadLoaded, messagesLoading, messages, markRead, atBottom, visible, user?.id, readRetry]);

  const selectConversation = (id: string) => {
    shouldStick.current = true;
    setAtBottom(true);
    setDetailsOpen(false);
    setParams({ conversation: id });
  };
  const updateDraft = (value: string) => {
    if (!selectedId) return;
    setDrafts((current) => ({ ...current, [selectedId]: value }));
    if (!typingThrottle.current || !value) {
      typing(selectedId, Boolean(value));
      if (value) typingThrottle.current = setTimeout(() => { typingThrottle.current = undefined; }, 1200);
    }
    clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => typing(selectedId, false), 1800);
  };
  const send = () => {
    const content = draft.trim();
    if (!content || content.length > 4000 || !active) return;
    shouldStick.current = true;
    setAtBottom(true);
    setDrafts((current) => ({ ...current, [active.id]: '' }));
    typing(active.id, false);
    void thread.send(content);
  };
  const loadOlder = async () => {
    const element = feed.current;
    if (element) scrollAnchor.current = { top: element.scrollTop, height: element.scrollHeight };
    await thread.loadOlder();
  };
  const jumpToBottom = () => {
    shouldStick.current = true;
    setAtBottom(true);
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' });
  };

  return <div className="chat-page">
    <div className="chat-page-heading">
      <div className="chat-heading-copy"><span className="chat-heading-icon"><MessageOutlined /></span>
        <div><span className="chat-eyebrow">KẾT NỐI CÙNG STAYAI</span><h1>Tin nhắn <span className="chat-title-count">{unread > 0 ? `${unread} chưa đọc` : 'Hộp thư của bạn'}</span></h1></div>
      </div>
      <div className="chat-heading-actions">
        <button className={`chat-connection chat-connection--${connection}`} onClick={reconnect} title="Kết nối lại và cập nhật hộp thư">
          <span />{CONNECTION_LABEL[connection]}{connection !== 'connected' && <ReloadOutlined />}
        </button>
        <Button type="primary" size="large" icon={<PlusOutlined />} aria-label="Cuộc trò chuyện mới" onClick={() => setNewChatOpen(true)}>Cuộc trò chuyện mới</Button>
      </div>
    </div>

    <div className={`chat-workspace ${selectedId || homestayId ? 'has-active' : ''}`}>
      <aside className="chat-inbox" aria-label="Danh sách hội thoại">
        <div className="chat-inbox-top"><div className="chat-inbox-title"><h2>Hội thoại</h2><span>{inbox.length}</span>
          <Tooltip title="Làm mới hộp thư"><Button type="text" size="small" icon={<ReloadOutlined spin={loading} />} aria-label="Làm mới hộp thư" onClick={() => void refreshInbox()} /></Tooltip>
        </div>
          <Input prefix={<SearchOutlined />} allowClear placeholder="Tìm tên, chỗ ở, tin nhắn…" aria-label="Tìm hội thoại" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chat-filter-tabs" role="tablist" aria-label="Lọc người đối thoại">
            {(['ALL', ...targetRoles] as const).map((value) => <button key={value} role="tab" aria-selected={filter === value}
              className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value === 'ALL' ? 'Tất cả' : FILTER_LABEL[value]}</button>)}
          </div>
          <label className="chat-unread-filter"><input type="checkbox" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} />Chỉ tin nhắn chưa đọc</label>
        </div>
        <div className="chat-inbox-list">
          {error && <div className="chat-inline-error" role="alert"><span>{error}</span><button onClick={() => void refreshInbox()}>Thử lại</button></div>}
          {loading && !inbox.length ? <div className="chat-list-loading"><Skeleton avatar active paragraph={{ rows: 1 }} /><Skeleton avatar active paragraph={{ rows: 1 }} /><Skeleton avatar active paragraph={{ rows: 1 }} /></div>
            : !filtered.length ? <div className="chat-small-state"><MessageOutlined /><strong>{query || onlyUnread || filter !== 'ALL' ? 'Không có hội thoại phù hợp' : 'Chưa có cuộc trò chuyện'}</strong>
              <p>{query || onlyUnread || filter !== 'ALL' ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : 'Một lời chào sẽ bắt đầu kết nối mới.'}</p>
              {!query && !onlyUnread && <Button type="link" onClick={() => setNewChatOpen(true)}>Bắt đầu trò chuyện <ArrowRightOutlined /></Button>}</div>
              : filtered.map((conversation) => <button key={conversation.id} onClick={() => selectConversation(conversation.id)}
                className={`chat-inbox-item ${selectedId === conversation.id ? 'is-selected' : ''} ${conversation.unread_count ? 'has-unread' : ''}`}
                aria-pressed={selectedId === conversation.id} aria-label={`${conversation.partner?.full_name ?? 'Người dùng'}${conversation.unread_count ? `, ${conversation.unread_count} tin chưa đọc` : ''}`}>
                <PersonAvatar person={conversation.partner} size={46} />
                <span className="chat-inbox-item-copy"><span className="chat-inbox-item-title"><strong>{conversation.partner?.full_name ?? 'Người dùng'}</strong><time>{inboxTime(conversation.last_message_at ?? conversation.created_at)}</time></span>
                  <span className="chat-inbox-item-role">{conversation.partner ? ROLE_LABEL[conversation.partner.role] : 'Cuộc trò chuyện'}{conversation.homestay && <span> · {conversation.homestay.name}</span>}</span>
                  <span className="chat-inbox-preview"><span>{conversation.last_message ? `${conversation.last_message.sender_id === user?.id ? 'Bạn: ' : ''}${conversation.last_message.content}` : 'Bắt đầu bằng một lời chào'}</span><Badge count={conversation.unread_count} size="small" overflowCount={99} /></span>
                </span>
              </button>)}
        </div>
        <div className="chat-inbox-footer"><MessageOutlined /><span>Trao đổi dễ dàng, chuyến đi an tâm.</span></div>
      </aside>

      <section className="chat-thread" aria-label="Nội dung cuộc trò chuyện">
        {!active ? <div className="chat-welcome">
          {selectedId || homestayId ? <>{currentError ? <><span className="chat-empty-art"><InfoCircleOutlined /></span><h2>Chưa thể mở cuộc trò chuyện</h2><p role="alert">{currentError}</p><Button onClick={() => { setSelectionError(null); setSelectionRetry((value) => value + 1); }}>Thử lại</Button></> : <><Spin size="large" /><p>Đang mở cuộc trò chuyện…</p></>}
            <Button className="chat-mobile-return" type="text" icon={<ArrowLeftOutlined />} onClick={() => setParams({})}>Về hộp thư</Button></>
            : <><div className="chat-empty-art"><MessageOutlined /><span><CheckOutlined /></span></div><span className="chat-eyebrow">LUÔN CÓ NGƯỜI LẮNG NGHE</span><h2>Mọi cuộc trò chuyện,<br />ở một nơi.</h2>
              <p>Kết nối với {role === 'ADMIN' ? 'khách hàng và chủ nhà' : role === 'HOST' ? 'khách hàng và đội ngũ StayAI' : 'chủ nhà và đội ngũ StayAI'} để mọi kế hoạch<br className="chat-desktop-break" /> cho chuyến đi đều rõ ràng hơn.</p>
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setNewChatOpen(true)}>Bắt đầu trò chuyện</Button>
              <div className="chat-welcome-features"><span><HomeOutlined /> Hỏi về chỗ ở</span><span><CustomerServiceOutlined /> Nhận hỗ trợ</span></div></>}
        </div> : <>
          <header className="chat-thread-header"><Button className="chat-back" type="text" icon={<ArrowLeftOutlined />} aria-label="Về danh sách hội thoại" onClick={() => setParams({})} />
            <PersonAvatar person={active.partner} />
            <div className="chat-thread-partner"><h2>{active.partner?.full_name ?? 'Người dùng'}</h2><span>{active.partner ? ROLE_LABEL[active.partner.role] : 'Người đối thoại'}{active.homestay ? ` · ${active.homestay.name}` : ''}</span></div>
            <Button className="chat-info-button" type="text" icon={<InfoCircleOutlined />} aria-label="Thông tin hội thoại" onClick={() => setDetailsOpen((value) => !value)} />
          </header>
          {active.homestay && <Link to={`/homestay/${active.homestay.id}`} className="chat-property-strip"><span><HomeOutlined />{active.homestay.name}</span><span>Xem chỗ ở <ArrowRightOutlined /></span></Link>}
          <div className="chat-feed-wrap">
            <div className="chat-feed" ref={feed} role="log" aria-label="Lịch sử tin nhắn" aria-live="polite" aria-relevant="additions text"
              onScroll={() => { if (!feed.current) return; const bottom = feed.current.scrollHeight - feed.current.scrollTop - feed.current.clientHeight < 72; shouldStick.current = bottom; setAtBottom(bottom); }}>
              {thread.error && <div className="chat-inline-error" role="alert"><span>{thread.error}</span><button onClick={() => void thread.reload()}>Thử lại</button></div>}
              {thread.hasMore && <Button type="text" className="chat-load-older" loading={thread.loadingOlder} onClick={() => void loadOlder()}>Xem tin nhắn trước</Button>}
              {!thread.loaded && thread.loading ? <div className="chat-thread-loading"><Spin /><span>Đang tải tin nhắn…</span></div>
                : !thread.messages.length && thread.loaded ? <div className="chat-first-message"><PersonAvatar person={active.partner} size={64} /><h3>Gửi lời chào đến {active.partner?.full_name}</h3><p>Đây là nơi bắt đầu cuộc trò chuyện của bạn.</p>
                  <div className="chat-prompts">{(active.partner?.role === 'ADMIN' ? ['Tôi cần hỗ trợ về đặt phòng', 'Tôi có một câu hỏi'] : role === 'HOST' || role === 'ADMIN' ? ['Chào bạn, mình có thể hỗ trợ gì?', 'Cảm ơn bạn đã liên hệ!'] : ['Chỗ ở có chỗ đỗ xe không?', 'Mình muốn hỏi giờ nhận phòng']).map((prompt) => <button key={prompt} onClick={() => updateDraft(prompt)}>{prompt}</button>)}</div></div>
                  : thread.messages.map((message, index) => <Fragment key={`${message.sender_id}:${message.client_message_id ?? message.id}`}>
                    {(index === 0 || new Date(thread.messages[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString()) && <div className="chat-day-separator"><span>{dayLabel(message.created_at)}</span></div>}
                    <MessageBubble message={message} mine={message.sender_id === user?.id} onRetry={() => void thread.send(message.content, message)} />
                  </Fragment>)}
              {thread.typing && <div className="chat-typing" role="status"><span><i /><i /><i /></span>{active.partner?.full_name ?? 'Đối phương'} đang nhập…</div>}
            </div>
            {!atBottom && <button className="chat-jump-bottom" onClick={jumpToBottom}><ArrowDownOutlined /> Đến tin nhắn mới nhất</button>}
          </div>
          <div className="chat-composer">
            {readError && <button className="chat-read-error" onClick={() => setReadRetry((value) => value + 1)}>Chưa cập nhật được trạng thái đã đọc. Thử lại</button>}
            <div className="chat-composer-box"><Input.TextArea value={draft} placeholder={`Nhắn cho ${active.partner?.full_name ?? 'người đối thoại'}…`} aria-label="Nội dung tin nhắn" maxLength={4000} autoSize={{ minRows: 1, maxRows: 5 }}
              onChange={(e) => updateDraft(e.target.value)} onBlur={() => typing(active.id, false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
              <Button type="primary" icon={<SendOutlined />} disabled={!draft.trim() || !thread.loaded} onClick={send} aria-label="Gửi tin nhắn">Gửi</Button>
            </div>
            <div className="chat-composer-hint"><span>Enter để gửi <span>·</span> Shift + Enter để xuống dòng</span><span>{draft.length.toLocaleString('vi-VN')}/4.000</span></div>
          </div>
        </>}
      </section>

      {active && <aside className={`chat-details ${detailsOpen ? 'is-open' : ''}`} aria-label="Thông tin hội thoại">
        <div className="chat-details-title"><h3>Thông tin hội thoại</h3><Button type="text" size="small" icon={<CloseOutlined />} aria-label="Đóng thông tin hội thoại" onClick={() => setDetailsOpen(false)} /></div>
        <div className="chat-details-person"><PersonAvatar person={active.partner} size={72} /><h3>{active.partner?.full_name}</h3><span className={`chat-role-tag chat-role-tag--${active.partner?.role.toLowerCase()}`}>{active.partner ? ROLE_LABEL[active.partner.role] : 'Người đối thoại'}</span></div>
        <div className="chat-details-section"><span className="chat-section-label">VỀ CUỘC TRÒ CHUYỆN</span><p><TeamOutlined />{active.type === 'CUSTOMER_HOST' ? 'Khách hàng & Chủ nhà' : active.type === 'HOST_ADMIN' ? 'Chủ nhà & StayAI' : 'Khách hàng & StayAI'}</p><p><MessageOutlined />Bắt đầu {new Date(active.created_at).toLocaleDateString('vi-VN')}</p></div>
        {active.homestay && <div className="chat-details-section"><span className="chat-section-label">CHỖ Ở ĐANG TRAO ĐỔI</span><Link className="chat-property-card" to={`/homestay/${active.homestay.id}`}><HomeOutlined /><strong>{active.homestay.name}</strong><ArrowRightOutlined /></Link></div>}
        <div className="chat-details-note"><CustomerServiceOutlined /><strong>Cùng trao đổi rõ ràng</strong><p>Giữ mọi thông tin về chuyến đi trong cuộc trò chuyện để dễ dàng xem lại khi cần.</p></div>
      </aside>}
    </div>
    <NewConversationModal key={`${role}:${newChatOpen}`} open={newChatOpen} role={role} onClose={() => setNewChatOpen(false)} onCreated={(conversation) => { setNewChatOpen(false); selectConversation(conversation.id); }} />
  </div>;
}
