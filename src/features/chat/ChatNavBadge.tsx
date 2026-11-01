import { Badge } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/auth';
import { useChat } from './ChatContext';

export default function ChatNavBadge({ role }: { role: UserRole }) {
  const { user } = useAuth();
  const { conversations } = useChat();
  const count = conversations.filter((c) => c.participants.some((p) => p.id === user?.id && p.role === role))
    .reduce((sum, c) => sum + c.unread_count, 0);
  return <span className="chat-nav-label">Tin nhắn <Badge count={count} size="small" overflowCount={99} /></span>;
}
