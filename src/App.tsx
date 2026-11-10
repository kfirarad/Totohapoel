import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Header, Footer } from '@/components'
import { Login } from '@/components/Login'
import { useAuth } from './contexts/AuthContext';
import { Column } from '@/pages/Column';
import { AdminLayout } from '@/components/AdminLayout';
import { ColumnsList } from '@/pages/admin/ColumnsList';
import { ColumnForm } from '@/pages/admin/ColumnForm';
import { GroupBet } from '@/pages/admin/GroupBet';
import { UsersList } from '@/pages/admin/UsersList';
import { TeamsList } from '@/pages/admin/TeamsList';
import { SyncRuns } from '@/pages/admin/SyncRuns';
import { QueryProvider } from '@/providers/QueryProvider';
import { ProfilePage } from './pages/ProfilePage';
import { StatsPage } from './pages/StatsPage';
import { GroupProvider } from '@/groups/GroupContext';
import { useGroup } from '@/groups/useGroup';
import { rememberInvite, takePendingInvite } from '@/groups/api';
import { JoinGroupPage } from '@/pages/groups/JoinGroupPage';
import { CreateGroupPage } from '@/pages/groups/CreateGroupPage';
import { GroupSettingsPage } from '@/pages/groups/GroupSettingsPage';

const RouterComponent = () => {
  const { profile } = useAuth();
  const { group, isLoading, isGroupAdmin } = useGroup();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // an invite link opened before signing in
  useEffect(() => {
    const code = takePendingInvite();
    if (code) navigate(`/join/${code}`, { replace: true });
  }, [navigate]);

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">{t('common.loading')}</div>;

  return (
    <Routes>
      <Route path="/join/:code" element={<JoinGroupPage />} />
      <Route path="/groups/new" element={<CreateGroupPage firstGroup={!group} />} />
      {!group ? (
        // not in any group yet: the only things to do are create one or open an invite link
        <Route path="*" element={<CreateGroupPage firstGroup />} />
      ) : (
        <>
          <Route path="/" element={<Navigate to="/column" />} />
          <Route path="/column" element={<Column />} />
          <Route path="/column/:columnId" element={<Column />} />
          <Route path="/column/:columnId/user/:userId" element={<Column />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/group" element={<GroupSettingsPage />} />
          {/* Admin: group admins run their group; super-admins also edit operator columns, users and teams */}
          {(isGroupAdmin || profile?.is_admin) && (
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/columns" />} />
              <Route path="columns" element={<ColumnsList />} />
              <Route path="group-bet" element={<GroupBet />} />
              <Route path="group-bet/:columnId" element={<GroupBet />} />
              {profile?.is_admin && (
                <>
                  <Route path="columns/new" element={<ColumnForm />} />
                  <Route path="columns/:id" element={<ColumnForm />} />
                  <Route path="users" element={<UsersList />} />
                  <Route path="teams" element={<TeamsList />} />
                  <Route path="sync" element={<SyncRuns />} />
                </>
              )}
            </Route>
          )}
          <Route path="*" element={<Navigate to="/column" />} />
        </>
      )}
    </Routes>
  );
};

/** Signed out: remember an invite link so it survives the Google sign-in redirect */
const SignedOut = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const m = pathname.match(/^\/join\/([^/]+)/);
    if (m) rememberInvite(m[1]);
  }, [pathname]);
  return <Login />;
};

function App() {
  const { user } = useAuth();
  return (
    <QueryProvider>
      <Router basename="/">
        <GroupProvider>
          <Header />
          {user ? <RouterComponent /> : <SignedOut />}
          <Footer />
        </GroupProvider>
      </Router>
    </QueryProvider>
  );
}

export default App;
