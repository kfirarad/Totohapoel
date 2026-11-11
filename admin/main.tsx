import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { isLocal, supabase } from './lib/supabase';
import { Button, Link, usePath } from './ui';
import { Dashboard } from './pages/Dashboard';
import { TotoTypes } from './pages/TotoTypes';
import { Columns } from './pages/Columns';
import { ColumnEdit } from './pages/ColumnEdit';
import { Groups } from './pages/Groups';
import { Users } from './pages/Users';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

const NAV = [['/', 'Dashboard'], ['/columns', 'Columns'], ['/types', 'Toto types'], ['/groups', 'Groups'], ['/users', 'Users']] as const;

function Routes() {
  const path = usePath().replace(/^\/admin(?=\/)/, ''); // old Winner bookmarklet opens /admin/columns/new#winner=…
  const col = path.match(/^\/columns\/([^/]+)$/);
  if (col) return <ColumnEdit id={col[1] === 'new' ? undefined : col[1]} />;
  if (path === '/columns') return <Columns />;
  if (path === '/types') return <TotoTypes />;
  if (path === '/groups') return <Groups />;
  if (path === '/users') return <Users />;
  return <Dashboard />;
}

function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const path = usePath();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setIsAdmin(undefined);
    supabase.from('profiles').select('is_system_admin').eq('id', session.user.id).single()
      .then(({ data }) => setIsAdmin(!!data?.is_system_admin));
  }, [session]);

  if (session === undefined) return null;
  if (!session) {
    return (
      <Center>
        <h1 className="text-xl font-semibold">Group Bet admin</h1>
        <Button kind="primary" onClick={() => supabase.auth.signInWithOAuth({
          provider: 'google', options: { redirectTo: location.origin + location.pathname },
        })}>Sign in with Google</Button>
        {isLocal && <LocalSignIn />}
      </Center>
    );
  }
  if (isAdmin === undefined) return null;
  if (!isAdmin) {
    return (
      <Center>
        <p>{session.user.email} is not a system admin.</p>
        <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>
      </Center>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-2.5">
          <span className="font-semibold">Group Bet admin</span>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map(([to, label]) => {
              const active = to === '/' ? path === '/' : path.startsWith(to);
              return <Link key={to} to={to} className={`rounded px-2 py-1 ${active ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>{label}</Link>;
            })}
          </nav>
          <span className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
            <a className="underline" href="https://supabase.com/dashboard/project/dbeyeyuewbksealxjtxb" target="_blank">Supabase Studio</a>
            {session.user.email}
            <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4"><Routes /></main>
    </div>
  );
}

/** Local stack only: seeded users have passwords (supabase/dev-seed.ts). */
function LocalSignIn() {
  const [email, setEmail] = useState('dev-a@groupbet.test');
  const [password, setPassword] = useState('');
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); supabase.auth.signInWithPassword({ email, password }); }}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="dev password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit">Local sign-in</Button>
    </form>
  );
}

const Center = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4">{children}</div>
);

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}><App /></QueryClientProvider>,
);
