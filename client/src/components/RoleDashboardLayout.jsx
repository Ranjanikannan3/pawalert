import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_CONFIG } from '../utils/roles';
import {
  PawPrint,
  LogOut,
  Bell,
  User,
  Shield,
  Car,
  HeartHandshake,
  Settings,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Menu,
  X,
  MapPin,
  FileText,
  Activity,
  Layers,
  Clock,
  Compass,
  CheckCircle2,
  Phone,
  Building,
  Radio,
} from 'lucide-react';

export default function RoleDashboardLayout({
  role,
  navItems = [],
  activeSection,
  setActiveSection,
  children,
}) {
  const { user, logout, authNotice, setAuthNotice, quickSwitchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(null);

  const roleMeta = ROLE_CONFIG[role] || ROLE_CONFIG.citizen;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSwitchDashboard = async (rConfig) => {
    if ((role || '').toLowerCase() === rConfig.key) return;
    setSwitchingRole(rConfig.key);
    try {
      if (quickSwitchDemoRole && user?.role !== rConfig.key) {
        await quickSwitchDemoRole(rConfig.key);
      }
    } catch (err) {
      console.warn('Role switch notice:', err);
    } finally {
      setSwitchingRole(null);
      navigate(rConfig.dashboardRoute);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* 1. DEDICATED ROLE-SPECIFIC SIDEBAR (DESKTOP) */}
      <aside
        style={{
          width: '260px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
        className="hidden-mobile-sidebar"
      >
        <div>
          {/* Brand Header */}
          <div
            style={{
              padding: '1.25rem 1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
              }}
            >
              <PawPrint size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                PawAlert <span style={{ color: '#2dd4bf' }}>AI</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px', fontWeight: 600 }}>
                {roleMeta.label} Portal
              </div>
            </div>
          </div>

          {/* Active User Badge Card */}
          <div
            style={{
              margin: '0.85rem 0.85rem 1.25rem 0.85rem',
              padding: '0.75rem 0.85rem',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: roleMeta.themeColor,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: 800,
              }}
            >
              {user ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user ? user.name : 'Stakeholder'}
              </div>
              <div style={{ fontSize: '0.675rem', color: '#2dd4bf', fontWeight: 600, textTransform: 'uppercase' }}>
                ● {user?.role || role}
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ padding: '0 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ padding: '0.35rem 0.65rem', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Navigation Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon || FileText;
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (setActiveSection) setActiveSection(item.key);
                    if (item.action) item.action();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? 'rgba(13, 148, 136, 0.18)' : 'transparent',
                    color: isActive ? '#2dd4bf' : '#cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Icon size={17} color={isActive ? '#2dd4bf' : '#94a3b8'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        background: item.badgeColor || '#ef4444',
                        color: '#ffffff',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Logout Button */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#f87171',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: roleMeta.themeColor,
                background: roleMeta.bgColor,
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                border: `1px solid ${roleMeta.themeColor}30`,
              }}
            >
              <span>{roleMeta.emoji}</span>
              <span>{roleMeta.label} Dashboard</span>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
              • {roleMeta.shortDesc}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#10b981', background: '#ecfdf5', padding: '0.25rem 0.65rem', borderRadius: '999px', fontWeight: 600 }}>
              <Radio size={12} className="animate-pulse" /> Live System Active
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-sm btn-secondary"
              style={{
                fontSize: '0.775rem',
                color: '#ef4444',
                borderColor: '#fecaca',
                background: '#ffffff',
                padding: '0.35rem 0.75rem',
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        {/* Universal Multi-Dashboard Switcher Bar */}
        <div
          style={{
            background: 'linear-gradient(90deg, #0f172a, #1e293b)',
            padding: '0.65rem 1.5rem',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={14} color="#38bdf8" /> Multi-Dashboard View:
            </span>
            <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
              Logged in as <strong style={{ color: '#f8fafc' }}>{user ? user.name : 'User'}</strong> ({user?.role || role}) — switch to any dashboard:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {Object.values(ROLE_CONFIG).map((rConfig) => {
              const isCurrent = (role || '').toLowerCase() === rConfig.key;
              return (
                <button
                  key={rConfig.key}
                  type="button"
                  onClick={() => handleSwitchDashboard(rConfig)}
                  disabled={switchingRole !== null}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '8px',
                    border: isCurrent ? `2px solid ${rConfig.themeColor}` : '1px solid #475569',
                    background: isCurrent ? `${rConfig.themeColor}25` : 'rgba(255, 255, 255, 0.05)',
                    color: isCurrent ? '#ffffff' : '#cbd5e1',
                    fontSize: '0.75rem',
                    fontWeight: isCurrent ? 800 : 500,
                    cursor: switchingRole ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: switchingRole && switchingRole !== rConfig.key ? 0.6 : 1,
                  }}
                  title={`Switch to ${rConfig.label} Dashboard`}
                >
                  <span>{switchingRole === rConfig.key ? '⏳' : rConfig.emoji}</span>
                  <span>{rConfig.label}</span>
                  {isCurrent && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: rConfig.themeColor,
                        display: 'inline-block',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unauthorized Access Denied Banner (If user attempted to visit another role's dashboard) */}
        {authNotice && (
          <div
            className="animate-fade-in"
            style={{
              margin: '1rem 1.5rem 0 1.5rem',
              padding: '0.85rem 1.25rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#b91c1c',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <AlertTriangle size={18} color="#ef4444" />
              <span>{authNotice} Redirected to your authorized dashboard.</span>
            </div>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Dashboard Main Content */}
        <main style={{ flex: 1, padding: '1.5rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
