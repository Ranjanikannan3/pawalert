import React, { useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Volume2, X, Navigation } from 'lucide-react';
import { soundService } from '../services/soundService';
import { getAnimalEmoji, getRiskColorClass } from '../utils/geoUtils';

export default function DriverAlertModal({ alert, onClose, soundEnabled = true }) {
  useEffect(() => {
    if (alert && soundEnabled) {
      soundService.playWarningSiren();
    }
  }, [alert, soundEnabled]);

  if (!alert) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: '90%',
        maxWidth: '520px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '3px solid #ef4444',
        boxShadow: '0 20px 40px rgba(239, 68, 68, 0.4), 0 0 30px rgba(239, 68, 68, 0.3)',
        overflow: 'hidden',
        animation: 'siren-flash 1.5s infinite ease-in-out',
      }}
    >
      {/* Alert Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          color: '#ffffff',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <ShieldAlert size={26} className="animate-bounce" />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.02em', margin: 0 }}>
              {alert.title}
            </h3>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
              Proximity Alert Active
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Alert Body */}
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className={`badge ${getRiskColorClass(alert.riskLevel)}`}>
            {alert.riskLevel} ACCIDENT RISK
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Navigation size={16} /> ~{alert.distanceMeters}m AHEAD
          </span>
        </div>

        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
          {alert.hotspotName}
        </h4>

        <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.4, marginBottom: '0.85rem' }}>
          {alert.message}
        </p>

        {/* Breakdown box */}
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
            HISTORICAL ACCIDENT CLUSTER STATS ({alert.reportCount} incidents):
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#7f1d1d' }}>
            <span>🐕 Dogs: {alert.animalDistribution?.Dog || 0}</span>
            <span>🐈 Cats: {alert.animalDistribution?.Cat || 0}</span>
            <span>🐂 Cattle: {alert.animalDistribution?.Cattle || 0}</span>
          </div>
        </div>

        {/* Footer Actions & Cooldown reminder */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            ⏳ 10-min cooldown enabled (anti-spam)
          </span>
          <button
            onClick={onClose}
            className="btn btn-sm btn-primary"
            style={{ background: '#0f172a', color: '#fff' }}
          >
            Acknowledge & Reduce Speed
          </button>
        </div>
      </div>
    </div>
  );
}
