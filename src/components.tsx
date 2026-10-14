import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function Wordmark({ home = '/' }: { home?: string }) {
  return <Link className="wordmark" to={home} aria-label="Commonplace home"><span className="brand-symbol" aria-hidden="true">c<span>•</span></span>commonplace<span className="wordmark-period">.</span></Link>;
}

export function Footer({ className }: { className: string }) {
  return <footer className={className}><span>© {new Date().getFullYear()} Commonplace</span><span>A little more human.</span></footer>;
}

export function Message({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <div className={`message${success ? ' success' : ''}`} role={success ? 'status' : 'alert'} aria-live="polite">{children}</div>;
}

export function Icon({ kind }: { kind: 'home' | 'person' | 'email' | 'lock' | 'eye' | 'shield' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {kind === 'home' && <><path d="M4 11 12 4l8 7v9H4v-9Z"/><path d="M9 20v-7h6v7"/></>}
    {kind === 'person' && <><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>}
    {kind === 'email' && <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></>}
    {kind === 'lock' && <><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>}
    {kind === 'eye' && <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>}
    {kind === 'shield' && <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>}
  </svg>;
}
