import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Header, Footer } from '@/components'
import { Login } from '@/components/Login'
import { useAuth } from './contexts/AuthContext';
import { Column } from '@/pages/Column';

const RouterComponent = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/column" />} />
    <Route path="/column" element={<Column />} />
  </Routes>
)

function App() {
  const { user } = useAuth();
  return (
    <Router>
      <Header />
      {
        user ? (
          <RouterComponent />
        ) : (
          <Login />
        )
      }
      <Footer />
    </Router>
  )
}

export default App
