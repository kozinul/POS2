import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Cashier from './pages/Cashier';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Cashier />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
