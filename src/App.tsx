import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import TransactionPage from '@/pages/TransactionPage';
import ImportTransactionsPage from '@/pages/ImportTransactionsPage';
import CompanyPage from '@/pages/CompanyPage';
import CustomerPage from '@/pages/CustomerPage';
import AuditLogsPage from '@/pages/AuditLogsPage';
import ExchangeRateCalendarPage from '@/pages/ExchangeRateCalendarPage';
import UsersPage from '@/pages/admin/UsersPage';
import CurrenciesPage from '@/pages/admin/CurrenciesPage';
import ExchangeRateSettingsPage from '@/pages/admin/ExchangeRateSettingsPage';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppToaster() {
  const location = useLocation();
  const isImportPage = location.pathname.includes('/import-transactions');
  return (
    <Toaster 
      richColors 
      closeButton
      position={isImportPage ? 'top-center' : 'bottom-right'} 
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppToaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Company management */}
        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <CompanyPage />
            </ProtectedRoute>
          }
        />

        {/* Company-scoped routes */}
        <Route
          path="/company/:companyId"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/transactions"
          element={
            <ProtectedRoute>
              <TransactionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/import-transactions"
          element={
            <ProtectedRoute>
              <ImportTransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/customers"
          element={
            <ProtectedRoute>
              <CustomerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/exchange-rates"
          element={
            <ProtectedRoute>
              <ExchangeRateCalendarPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/currencies"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <CurrenciesPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exchange-rates"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <ExchangeRateSettingsPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        {/* Default: redirect to companies list */}
        <Route path="/" element={<Navigate to="/companies" replace />} />
        <Route path="*" element={<Navigate to="/companies" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
