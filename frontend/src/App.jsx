import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AppProvider, ToastProvider, ToastViewport } from './context/index.js';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import PublicDashboard from './pages/PublicDashboard.jsx';
import Login from './pages/Login.jsx';
import SetPassword from './pages/SetPassword.jsx';
import Layout from './components/layout/layout.jsx';
import Loading from './components/ui/Loading.jsx';
import { NotFoundPage, ForbiddenPage, UnauthorizedPage, ServerErrorPage } from './pages/ErrorPage.jsx';

// Lazy-loaded admin pages
const Dashboard = lazy(() => import('./pages/Admin/Dashboard.jsx'));
const Activities = lazy(() => import('./pages/Admin/Activities.jsx'));
const ActivityDetail = lazy(() => import('./pages/Admin/ActivityDetail.jsx'));
const ActivityForm = lazy(() => import('./pages/Admin/ActivityForm.jsx'));
const FollowUpForm = lazy(() => import('./pages/Admin/FollowUpForm.jsx'));
const Compliance = lazy(() => import('./pages/Admin/Compliance.jsx'));
const Analytics = lazy(() => import('./pages/Admin/Analytics.jsx'));
const Users = lazy(() => import('./pages/Admin/Users.jsx'));
const OrgUnits = lazy(() => import('./pages/Admin/OrgUnits.jsx'));
const SecurityLog = lazy(() => import('./pages/Admin/SecurityLog.jsx'));
const WeeklyMetrics = lazy(() => import('./pages/Admin/WeeklyMetrics.jsx'));
const PresentationDates = lazy(() => import('./pages/Admin/PresentationDates.jsx'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <ToastProvider>
              <Suspense fallback={<Loading full label="Loading page…" />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<PublicDashboard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/set-password" element={<SetPassword />} />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  <Route path="/forbidden" element={<ForbiddenPage />} />
                  <Route path="/error" element={<ServerErrorPage />} />

                  {/* Protected admin routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                      <Route path="/admin" element={<Dashboard />} />
                      <Route path="/admin/activities" element={<Activities />} />
                      <Route path="/admin/activities/new" element={<ActivityForm />} />
                      <Route path="/admin/activities/:id" element={<ActivityDetail />} />
                      <Route path="/admin/activities/:id/edit" element={<ActivityForm />} />
                      <Route path="/admin/activities/:id/follow-up" element={<FollowUpForm />} />
                      <Route path="/admin/compliance" element={<Compliance />} />
                      <Route path="/admin/analytics" element={<Analytics />} />
                      <Route path="/admin/weekly-metrics" element={<WeeklyMetrics />} />
                      <Route path="/admin/users" element={<Users />} />
                      <Route path="/admin/org-units" element={<OrgUnits />} />
                      <Route path="/admin/presentation-dates" element={<PresentationDates />} />
                      <Route path="/admin/security" element={<SecurityLog />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
              <ToastViewport />
            </ToastProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;