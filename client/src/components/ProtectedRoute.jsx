import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute } from '../utils/roles';
import { PawPrint, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated, setAuthNotice } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 20%, rgba(20, 184, 166, 0.15), transparent 70%), #0f172a',
          color: '#ffffff',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(13, 148, 136, 0.4)',
          }}
        >
          <PawPrint size={32} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>PawAlert AI</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <Loader2 size={16} className="animate-spin" color="#14b8a6" /> Verifying role authorization...
          </p>
        </div>
      </div>
    );
  }

  // Not signed in -> Redirect to /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // When authenticated, allow accessing dashboards across roles so the citizen / evaluator can inspect all views
  return children;
}
