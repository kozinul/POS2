import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Orders from './pages/Orders';
import Users from './pages/Users';
import Families from './pages/Families';
import Members from './pages/Members';
import Promotions from './pages/Promotions';
import Taxes from './pages/Taxes';
import PaymentMethods from './pages/PaymentMethods';
import Modifiers from './pages/Modifiers';
import Outlets from './pages/Outlets';
import Roles from './pages/Roles';
import ReportSales from './pages/ReportSales';
import ReportFinance from './pages/ReportFinance';
import ReportCashier from './pages/ReportCashier';
import Settings from './pages/Settings';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <div>Akses ditolak</div>;
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
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="families" element={<Families />} />
          <Route path="members" element={<Members />} />
          <Route path="promotions" element={<Promotions />} />
          <Route path="taxes" element={<Taxes />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
          <Route path="modifiers" element={<Modifiers />} />
          <Route path="outlets" element={<Outlets />} />
          <Route path="roles" element={<Roles />} />
          <Route path="users" element={<Users />} />
          <Route path="orders" element={<Orders />} />
          <Route path="reports/sales" element={<ReportSales />} />
          <Route path="reports/finance" element={<ReportFinance />} />
          <Route path="reports/cashier" element={<ReportCashier />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
