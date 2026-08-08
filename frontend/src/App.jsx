import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AppProvider } from './context';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicDashboard from './pages/PublicDashboard';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import Layout from './components/layout/Layout';

// Lazy-loaded admin pages
const Dashboard = lazy(() => import('./pages/Admin/Dashboard'));
const Activities = lazy(() => import('./pages/Admin/Activities'));
const ActivityForm = lazy(() => import('./pages/Admin/ActivityForm'));
const FollowUpForm = lazy(() => import('./pages/Admin/FollowUpForm'));
const Compliance = lazy(() => import('./pages/Admin/Compliance'));
const Analytics = lazy(() => import('./pages/Admin/Analytics'));
const Users = lazy(() => import('./pages/Admin/Users'));
const SecurityLog = lazy(() => import('./pages/Admin/SecurityLog'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<PublicDashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/set-password" element={<SetPassword />} />

                {/* Protected admin routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/admin" element={<Dashboard />} />
                    <Route path="/admin/activities" element={<Activities />} />
                    <Route path="/admin/activities/new" element={<ActivityForm />} />
                    <Route path="/admin/activities/:id/edit" element={<ActivityForm />} />
                    <Route path="/admin/activities/:id/follow-up" element={<FollowUpForm />} />
                    <Route path="/admin/compliance" element={<Compliance />} />
                    <Route path="/admin/analytics" element={<Analytics />} />
                    <Route path="/admin/users" element={<Users />} />
                    <Route path="/admin/security" element={<SecurityLog />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;