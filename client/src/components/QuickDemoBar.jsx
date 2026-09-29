import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, User, Car, Shield, HeartHandshake, Settings, RefreshCw, Volume2, Check } from 'lucide-react';
import { api } from '../services/api';
import { soundService } from '../services/soundService';

export default function QuickDemoBar({ activeTab, setActiveTab }) {
  const { user, quickSwitchDemoRole } = useAuth();
  const [recalculating, setRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState(false);

  const handleRecalculate = async () => {
    setRecalculating(true);
    setRecalcSuccess(false);
    try {
      await api.recalculateHotspots();
      setRecalcSuccess(true);
      setTimeout(() => setRecalcSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setRecalculating(false);
    }
  };

  const roles = [
    { key: 'citizen', label: 'Citizen', icon: User },
    { key: 'driver', label: 'Driver HUD', icon: Car },
    { key: 'authority', label: 'Authority GIS', icon: Shield },
    { key: 'ngo', label: 'NGO Rescue', icon: HeartHandshake },
    { key: 'admin', label: 'Admin', icon: Settings },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '999px',
        padding: '0.45rem 0.85rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: '#ffffff',
        maxWidth: '96vw',
        overflowX: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingRight: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.15)', fontSize: '0.75rem', fontWeight: 700, color: '#2dd4bf', whiteSpace: 'nowrap' }}>
        <Sparkles size={15} /> Demo Controller:
      </div>

      {/* Role Jumpers */}
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = activeTab === r.key;
          return (
            <button
              key={r.key}
              onClick={async () => {
                await quickSwitchDemoRole(r.key);
                setActiveTab(r.key);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isActive ? '#0d9488' : 'rgba(255, 255, 255, 0.08)',
                color: isActive ? '#ffffff' : '#cbd5e1',
                border: 'none',
                borderRadius: '999px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} />
              {r.label}
            </button>
          );
        })}
        <button
          onClick={() => setActiveTab('login')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: activeTab === 'login' ? '#0d9488' : 'rgba(255, 255, 255, 0.12)',
            color: '#2dd4bf',
            border: '1px solid rgba(45, 212, 191, 0.4)',
            borderRadius: '999px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          <User size={14} /> Auth Portal
        </button>
      </div>

      {/* Quick Action Tools */}
      <div style={{ display: 'flex', gap: '0.35rem', paddingLeft: '0.5rem', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          title="Run DBSCAN clustering algorithm on all reports"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: recalcSuccess ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '999px',
            padding: '0.35rem 0.7rem',
            fontSize: '0.725rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {recalcSuccess ? <Check size={13} /> : <RefreshCw size={13} className={recalculating ? 'animate-spin' : ''} />}
          {recalculating ? 'Clustering...' : recalcSuccess ? 'DBSCAN Synced!' : 'Re-run DBSCAN'}
        </button>

        <button
          onClick={() => soundService.playWarningSiren()}
          title="Test Driver Emergency Warning Siren"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '999px',
            padding: '0.35rem 0.7rem',
            fontSize: '0.725rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Volume2 size={13} /> Siren Test
        </button>
      </div>
    </div>
  );
}
