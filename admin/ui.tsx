// Tiny UI kit + router. No routing library: path routing over history.pushState.
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export const navigate = (to: string) => {
  history.pushState(null, '', to);
  dispatchEvent(new PopStateEvent('popstate'));
};

export const usePath = () => {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => setPath(location.pathname);
    addEventListener('popstate', on);
    return () => removeEventListener('popstate', on);
  }, []);
  return path;
};

export const Link = ({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) => (
  <a href={to} className={className} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(to); }}>
    {children}
  </a>
);

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'plain' | 'danger' };
export const Button = ({ kind = 'plain', className = '', ...p }: BtnProps) => (
  <button
    {...p}
    className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
      kind === 'primary' ? 'bg-zinc-900 text-white hover:bg-zinc-700'
      : kind === 'danger' ? 'border border-red-300 text-red-700 hover:bg-red-50'
      : 'border border-zinc-300 bg-white hover:bg-zinc-100'} ${className}`}
  />
);

export const Card = ({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) => (
  <section className="rounded-lg border border-zinc-200 bg-white p-4">
    {(title || actions) && (
      <div className="mb-3 flex items-center justify-between gap-2">
        {title && <h2 className="font-semibold">{title}</h2>}
        <div className="flex gap-2">{actions}</div>
      </div>
    )}
    {children}
  </section>
);

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">{label}{children}</label>
);

export const Badge = ({ tone = 'zinc', children }: { tone?: 'zinc' | 'green' | 'amber' | 'red' | 'blue'; children: ReactNode }) => {
  const tones = { zinc: 'bg-zinc-100 text-zinc-700', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', blue: 'bg-blue-100 text-blue-800' };
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
};

export const ErrorText = ({ error }: { error: unknown }) =>
  error ? <p className="text-sm text-red-700">{error instanceof Error ? error.message : String(error)}</p> : null;

export const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
