import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Input, Modal, Segmented, Skeleton, Spin } from 'antd';
import { ArrowRightOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { UserRole } from '../../types/auth';
import type { ChatContact, Conversation } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { useChat } from './ChatContext';
import { chatError, conversationType, recipientRoles, ROLE_LABEL } from './chat.utils';

export default function NewConversationModal({ open, role, onClose, onCreated }: {
  open: boolean; role: UserRole; onClose: () => void; onCreated: (conversation: Conversation) => void;
}) {
  const roles = recipientRoles(role);
  const [target, setTarget] = useState<UserRole>(roles[0]);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const request = useRef(0);
  const { createConversation } = useChat();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const sequence = ++request.current;
    const timer = setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const result = await chatService.contacts(target, search, page, controller.signal);
        if (sequence !== request.current || controller.signal.aborted) return;
        setContacts((current) => page === 1 ? result.contacts ?? [] : [...current, ...result.contacts ?? []]);
        setMore(result.has_more);
      } catch (err) { if (!controller.signal.aborted) setError(chatError(err)); }
      finally { if (!controller.signal.aborted && sequence === request.current) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, target, search, page, reload]);

  const start = async (contact: ChatContact) => {
    setCreating(contact.id); setError(null);
    try {
      const conversation = await createConversation({ type: conversationType(role, contact.role),
        recipient_id: contact.id, as_role: role });
      onCreated(conversation);
    } catch (err) { setError(chatError(err)); }
    finally { setCreating(null); }
  };

  return <Modal open={open} onCancel={onClose} footer={null} title="Cuộc trò chuyện mới" width={490}
    className="chat-new-modal" destroyOnHidden>
    <p className="chat-muted chat-new-intro">Chọn người bạn muốn kết nối và bắt đầu trao đổi.</p>
    <Segmented block value={target} options={roles.map((value) => ({ value, label: ROLE_LABEL[value] }))}
      onChange={(value) => { setTarget(value); setContacts([]); setPage(1); setLoading(true); }} />
    <Input size="large" allowClear prefix={<SearchOutlined />} value={search} placeholder="Tìm theo tên…"
      aria-label="Tìm người để nhắn tin" onChange={(e) => { setSearch(e.target.value); setPage(1); setContacts([]); setLoading(true); }} />
    <div className="chat-contacts-list">
      {error ? <div className="chat-small-state"><p>{error}</p><Button onClick={() => setReload((value) => value + 1)}>Thử lại</Button></div>
        : loading && !contacts.length ? <div className="chat-contact-skeleton"><Skeleton avatar active paragraph={{ rows: 1 }} /><Skeleton avatar active paragraph={{ rows: 1 }} /></div>
        : !contacts.length ? <div className="chat-small-state"><SearchOutlined /><strong>Chưa tìm thấy người phù hợp</strong><p>Thử một tên khác hoặc chọn nhóm đối thoại khác.</p></div>
        : contacts.map((contact) => <button className="chat-contact" key={`${contact.role}:${contact.id}`} disabled={Boolean(creating)} onClick={() => void start(contact)}>
          <Avatar size={44} src={contact.avatar_url} icon={<UserOutlined />} className={`chat-avatar chat-avatar--${contact.role.toLowerCase()}`} />
          <span><strong>{contact.full_name}</strong><small>{ROLE_LABEL[contact.role]}</small></span>
          {creating === contact.id ? <Spin size="small" /> : <ArrowRightOutlined />}
        </button>)}
      {more && !error && <Button block type="text" loading={loading} onClick={() => setPage((value) => value + 1)}>Xem thêm</Button>}
    </div>
  </Modal>;
}
