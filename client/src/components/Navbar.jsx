import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PawPrint,
  Bell,
  User,
  Shield,
  Car,
  HeartHandshake,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { soundService } from '../services/soundService';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, quickSwitchDemoRole } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await api.getNotifications(user?.role || 'all');
        if (res.success) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        }
      } catch (e) {}
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead(user?.role || 'all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {}
  };

  const roleConfig = {
    citizen: { label: 'Citizen', icon: User, color: 'text-teal-600 bg-teal-50' },
    driver: { label: 'Driver', icon: Car, color: 'text-blue-600 bg-blue-50' },
    authority: { label: 'Municipality Authority', icon: Shield, color: 'text-purple-600 bg-purple-50' },
    ngo: { label: 'Rescue NGO', icon: HeartHandshake, color: 'text-rose-600 bg-rose-50' },
    admin: { label: 'System Admin', icon: Settings, color: 'text-amber-600 bg-amber-50' },
  };

  const currentRole = roleConfig[user?.role || 'citizen'];

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Brand Logo */}
      <div
        onClick={() => setActiveTab('landing')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0d9488, #0f766e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 4px 10px rgba(13, 148, 136, 0.35)',
        }}>
          <PawPrint size={24} />
        </div>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.1,
          }}>
            PawAlert <span style={{ color: '#0d9488' }}>AI</span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.15rem 0.45rem',
              borderRadius: '999px',
              background: '#ccfbf1',
              color: '#0f766e',
              textTransform: 'uppercase',
            }}>GIS Core</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Accident Prevention & Rescue
          </p>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('landing')}
          className={`btn btn-sm ${activeTab === 'landing' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Home
        </button>

        <button
          onClick={() => setActiveTab('citizen')}
          className={`btn btn-sm ${activeTab === 'citizen' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <User size={15} /> Citizen Report
        </button>

        <button
          onClick={() => setActiveTab('driver')}
          className={`btn btn-sm ${activeTab === 'driver' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Car size={15} /> Driver HUD
        </button>

        <button
          onClick={() => setActiveTab('authority')}
          className={`btn btn-sm ${activeTab === 'authority' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Shield size={15} /> Authority GIS
        </button>

        <button
          onClick={() => setActiveTab('ngo')}
          className={`btn btn-sm ${activeTab === 'ngo' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <HeartHandshake size={15} /> NGO Rescue
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`btn btn-sm ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Settings size={15} /> Admin
        </button>

        <button
          onClick={() => setActiveTab('login')}
          className={`btn btn-sm ${activeTab === 'login' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ background: activeTab === 'login' ? undefined : '#f0fdfa', borderColor: '#99f6e4', color: '#0d9488', fontWeight: 700 }}
        >
          <User size={15} /> Sign In
        </button>
      </div>

      {/* Right User Actions & Notification Bell */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              soundService.playNotificationChime();
            }}
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              cursor: 'pointer',
            }}
            title="System Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '18px',
                height: '18px',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fff',
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Menu Panel */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '340px',
              maxHeight: '420px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '0.85rem 1rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Live Alerts & Activity</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0d9488',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n._id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f8fafc',
                        background: n.read ? '#ffffff' : '#f0fdfa',
                        display: 'flex',
                        gap: '0.65rem',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{
                        marginTop: '2px',
                        color: n.type.includes('HOTSPOT') ? '#ef4444' : '#0d9488',
                      }}>
                        {n.type.includes('HOTSPOT') ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.825rem', color: '#0f172a' }}>{n.title}</p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{n.message}</p>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 1-Click Role Switcher & User Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#0d9488',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              {user ? user.name[0].toUpperCase() : 'G'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                {user ? user.name.split(' ')[0] : 'Demo User'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#0d9488', fontWeight: 600, textTransform: 'capitalize' }}>
                {user?.role || 'Guest'}
              </div>
            </div>
            <ChevronDown size={14} color="#64748b" />
          </button>

          {/* Quick Demo Switcher Menu */}
          {showRoleMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '45px',
              width: '240px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0',
              zIndex: 100,
              padding: '0.5rem',
            }}>
              <div style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                👤 {user ? `${user.name} (${user.role})` : 'Demo / Guest User'}
              </div>

              {user && (
                <div style={{ paddingBottom: '0.35rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.35rem' }}>
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      setActiveTab('landing');
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.45rem 0.75rem',
                      background: activeTab === 'landing' ? '#f0fdfa' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <PawPrint size={14} color="#0d9488" /> Home Page
                  </button>

                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      setActiveTab(user.role || 'citizen');
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.45rem 0.75rem',
                      background: activeTab === user.role ? '#f0fdfa' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#0d9488',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Sparkles size={14} color="#0d9488" /> My {user.role?.toUpperCase()} Dashboard
                  </button>
                </div>
              )}

              <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Switch Role / Persona:
              </div>

              {['citizen', 'driver', 'authority', 'ngo', 'admin'].map((r) => (
                <button
                  key={r}
                  onClick={async () => {
                    await quickSwitchDemoRole(r);
                    setShowRoleMenu(false);
                    setActiveTab(r);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.45rem 0.75rem',
                    background: user?.role === r ? '#f0fdfa' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: user?.role === r ? 700 : 500,
                    color: user?.role === r ? '#0d9488' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ textTransform: 'capitalize' }}>{r}</span>
                  {user?.role === r && <Sparkles size={14} color="#0d9488" />}
                </button>
              ))}
              <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '0.35rem', paddingTop: '0.35rem' }}>
                <button
                  onClick={() => {
                    setShowRoleMenu(false);
                    setActiveTab('login');
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.45rem 0.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#0d9488',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <User size={14} /> {user ? 'Switch Account / Sign In' : 'Sign In / Register'}
                </button>
                {user && (
                  <button
                    onClick={() => {
                      logout();
                      setShowRoleMenu(false);
                      setActiveTab('landing');
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.45rem 0.75rem',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginTop: '2px',
                    }}
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
