import { Link } from 'react-router-dom';

export default function Brand({ to = '/', inverse = false, compact = false, caption, className = '', onClick }: {
  to?: string; inverse?: boolean; compact?: boolean; caption?: string; className?: string; onClick?: () => void;
}) {
  return <Link to={to} onClick={onClick} className={`brand${inverse ? ' brand--inverse' : ''}${compact ? ' brand--compact' : ''} ${className}`} aria-label={`StayAI · ${caption ?? 'Trang chủ'}`}>
    <svg className="brand-symbol" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M7 21 20 9l13 12v13H7V21Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M15 34V23h10v11M28 9V5M26 7h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 16c4 1 9 0 12-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
    {!compact && <span className="brand-copy"><strong>stay<span>ai</span><i>®</i></strong>{caption && <small>{caption}</small>}</span>}
  </Link>;
}
