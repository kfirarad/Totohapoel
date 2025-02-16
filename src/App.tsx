import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Header, Footer } from '@/components'
import { Login } from '@/components/Login'
import { useAuth } from './contexts/AuthContext';
import { Column } from '@/pages/Column';
import { AdminLayout } from '@/components/AdminLayout';
import { ColumnsList } from '@/pages/admin/ColumnsList';
import { ColumnForm } from '@/pages/admin/ColumnForm';
import { QueryProvider } from '@/providers/QueryProvider';

const RouterComponent = () => {
  const { profile } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/column" />} />
      <Route path="/column" element={<Column />} />
      <Route path="/column/:columnId" element={<Column />} />
      <Route path="/column/:columnId/user/:userId" element={<Column />} />
      {/* Admin Routes */}
      {profile?.is_admin && (
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/columns" />} />
          <Route path="columns" element={<ColumnsList />} />
          <Route path="columns/new" element={<ColumnForm />} />
          <Route path="columns/:id" element={<ColumnForm />} />
          <Route path="users" element={<div>Users management coming soon</div>} />          
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
