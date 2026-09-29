import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import { getDashboardRoute } from './utils/roles';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CitizenDashboard from './pages/CitizenDashboard';
import NgoDashboard from './pages/NgoDashboard';
import AuthorityDashboard from './pages/AuthorityDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';

function RootAuthRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated && user) {
    return <Navigate to={getDashboardRoute(user.role)} replace />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Authentication & Role Selection Portal */}
          <Route path="/" element={<RootAuthRoute />} />
          <Route path="/login" element={<RootAuthRoute />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* 1. Citizen Protected Routes */}
          <Route path="/citizen" element={<Navigate to="/citizen/dashboard" replace />} />
          <Route
            path="/citizen/dashboard"
            element={
              <ErrorBoundary>
                <ProtectedRoute allowedRoles={['citizen']}>
                  <CitizenDashboard />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route path="/citizen/*" element={<Navigate to="/citizen/dashboard" replace />} />

          {/* 2. NGO / Veterinary Protected Routes */}
          <Route path="/ngo" element={<Navigate to="/ngo/dashboard" replace />} />
          <Route
            path="/ngo/dashboard"
            element={
              <ErrorBoundary>
                <ProtectedRoute allowedRoles={['ngo']}>
                  <NgoDashboard />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route path="/ngo/*" element={<Navigate to="/ngo/dashboard" replace />} />

          {/* 3. Municipal Authority Protected Routes */}
          <Route path="/authority" element={<Navigate to="/authority/dashboard" replace />} />
          <Route
            path="/authority/dashboard"
            element={
              <ErrorBoundary>
                <ProtectedRoute allowedRoles={['authority']}>
                  <AuthorityDashboard />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route path="/authority/*" element={<Navigate to="/authority/dashboard" replace />} />

          {/* 4. Driver Safety Protected Routes */}
          <Route path="/driver" element={<Navigate to="/driver/dashboard" replace />} />
          <Route
            path="/driver/dashboard"
            element={
              <ErrorBoundary>
                <ProtectedRoute allowedRoles={['driver']}>
                  <DriverDashboard />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route path="/driver/*" element={<Navigate to="/driver/dashboard" replace />} />

          {/* 5. System Administrator Protected Routes */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <ErrorBoundary>
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
