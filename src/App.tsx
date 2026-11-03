import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import { QueryProvider } from '@/providers/QueryProvider';
import { ProfilePage } from './pages/ProfilePage';
import { StatsPage } from './pages/StatsPage';

const RouterComponent = () => {
  const { profile } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/column" />} />
      <Route path="/column" element={<Column />} />
      <Route path="/column/:columnId" element={<Column />} />
      <Route path="/column/:columnId/user/:userId" element={<Column />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/stats" element={<StatsPage />} />
      {/* Admin Routes */}
      {profile?.is_admin && (
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/columns" />} />
          <Route path="columns" element={<ColumnsList />} />
          <Route path="columns/new" element={<ColumnForm />} />
          <Route path="columns/:id" element={<ColumnForm />} />
          <Route path="group-bet" element={<GroupBet />} />
          <Route path="group-bet/:columnId" element={<GroupBet />} />
          <Route path="users" element={<UsersList />} />
          <Route path="teams" element={<TeamsList />} />
        </Route>
      )}
    </Routes>
  );
};

function App() {
  const { user } = useAuth();
  return (
    <QueryProvider>
      <Router basename="/">
        <Header />
        {user ? <RouterComponent /> : <Login />}
        <Footer />
      </Router>
    </QueryProvider>
  );
}

export default App;
