import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_CONFIG, getDashboardRoute } from '../utils/roles';
import confetti from 'canvas-confetti';
import {
  PawPrint,
  User,
  Shield,
  Car,
  HeartHandshake,
  Settings,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  MapPin,
  Clock,
  Radio,
} from 'lucide-react';

const ROLE_OPTIONS = [
  {
    key: 'citizen',
    label: 'Citizen',
    desc: 'Report animal accidents and track rescue requests.',
    icon: User,
    color: '#0d9488',
    bgColor: '#ccfbf1',
    heading: 'Welcome, Citizen',
    subheading: 'Sign in to report accidents and track live rescue updates.',
    demoEmail: 'citizen@pawalert.demo',
    demoPassword: 'Citizen@123',
  },
  {
    key: 'ngo',
    label: 'NGO / Veterinary',
    desc: 'Manage rescue requests and coordinate animal rescue.',
    icon: HeartHandshake,
    color: '#e11d48',
    bgColor: '#ffe4e6',
    heading: 'Welcome, Rescue Partner',
    subheading: 'Sign in to coordinate emergency animal rescue and medical operations.',
    demoEmail: 'ngo@pawalert.demo',
    demoPassword: 'Ngo@123',
  },
  {
    key: 'authority',
    label: 'Authority',
    desc: 'Monitor accident reports and manage accident hotspots.',
    icon: Shield,
    color: '#7c3aed',
    bgColor: '#ede9fe',
    heading: 'Welcome, Authority',
    subheading: 'Sign in to monitor accident reports, GIS hotspots, and remediation.',
    demoEmail: 'authority@pawalert.demo',
    demoPassword: 'Authority@123',
  },
  {
    key: 'driver',
    label: 'Driver',
    desc: 'Receive alerts when approaching animal accident hotspots.',
    icon: Car,
    color: '#0284c7',
    bgColor: '#e0f2fe',
    heading: 'Welcome, Driver',
    subheading: 'Sign in to receive real-time 350m proximity accident radar alerts.',
    demoEmail: 'driver@pawalert.demo',
    demoPassword: 'Driver@123',
  },
  {
    key: 'admin',
    label: 'Admin',
    desc: 'Manage users, reports, hotspots and the platform.',
    icon: Settings,
    color: '#d97706',
    bgColor: '#fef3c7',
    heading: 'Welcome, Administrator',
    subheading: 'Sign in to tune DBSCAN spatial clustering and configure the platform.',
    demoEmail: 'admin@pawalert.demo',
    demoPassword: 'Admin@123',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const activeRoleConfig = ROLE_OPTIONS.find((r) => r.key === selectedRole) || ROLE_OPTIONS[0];

  const handleSelectRole = (roleKey) => {
    setSelectedRole(roleKey);
    const demo = ROLE_OPTIONS.find((r) => r.key === roleKey);
    if (demo) {
      setEmail(demo.demoEmail);
      setPassword(demo.demoPassword);
    }
    setError(null);
  };

  const handleTryDemo = (demoAccount) => {
    setSelectedRole(demoAccount.key);
    setEmail(demoAccount.demoEmail);
    setPassword(demoAccount.demoPassword);
    setError(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole || !email || !password) {
      setError('Please select a role and enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password, selectedRole);
      try {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#0d9488', '#0284c7', '#10b981', '#f59e0b', '#7c3aed'],
        });
      } catch (e) {}

      // Automatic Redirect to isolated role dashboard
      const targetDashboard = getDashboardRoute(user.role || selectedRole);
      navigate(targetDashboard, { replace: true });
    } catch (err) {
      setError(
        err.message ||
          'Unable to connect to PawAlert AI. Please verify your credentials or try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = !selectedRole || !email.trim() || !password.trim() || loading;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 10% 20%, rgba(20, 184, 166, 0.08), transparent 50%), radial-gradient(circle at 90% 80%, rgba(2, 132, 199, 0.08), transparent 50%), #0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
      }}
    >
      <div
        style={{
          maxWidth: '1160px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '2.5rem',
          alignItems: 'center',
        }}
      >
        {/* ================= LEFT SIDE: PAWALERT AI BRANDING ================= */}
        <div style={{ color: '#ffffff', padding: '1rem' }}>
          {/* Logo & Platform Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(13, 148, 136, 0.45)',
              }}
            >
              <PawPrint size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                PawAlert <span style={{ color: '#2dd4bf' }}>AI</span>
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '2px' }}>
                Intelligent GIS & Rescue Platform
              </p>
            </div>
          </div>

          {/* Master Tagline */}
          <blockquote
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              lineHeight: 1.3,
              color: '#f8fafc',
              borderLeft: '4px solid #2dd4bf',
              paddingLeft: '1.1rem',
              margin: '0 0 1.5rem 0',
            }}
          >
            “Prevent accidents before they happen.{' '}
            <span style={{ color: '#2dd4bf' }}>Rescue lives when they do.”</span>
          </blockquote>

          <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
            An AI and GIS-powered platform for street animal accident reporting, hotspot detection, driver safety alerts, and rescue coordination.
          </p>

          {/* 4 Architectural Pipeline Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '2rem' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2dd4bf', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>
                <Sparkles size={15} /> AI Image Classifier
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Instant Dog, Cat, and Cattle recognition with confidence scoring.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>
                <MapPin size={15} /> DBSCAN Hotspots
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Spatial density clustering identifies repeat accident danger zones.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f43f5e', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>
                <HeartHandshake size={15} /> Rescue Dispatch
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Real-time ambulance queues and 7-stage animal recovery tracking.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>
                <Car size={15} /> Driver Safety HUD
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                350m proximity GPS audio sirens with intelligent cooldown.
              </p>
            </div>
          </div>

          {/* Viva / Demo Quick Bar */}
          <div
            style={{
              background: 'rgba(13, 148, 136, 0.1)',
              border: '1px solid rgba(45, 212, 191, 0.25)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.775rem', color: '#cbd5e1' }}>
              ⚡ <strong>1-Click Viva Demonstrator:</strong> Click any role on the right to pre-fill credentials!
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2dd4bf',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              View Passwords ↗
            </button>
          </div>
        </div>

        {/* ================= RIGHT SIDE: ROLE SELECTION & LOGIN CARD ================= */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '2.25rem',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Card Top Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Welcome Back
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: activeRoleConfig.bgColor,
                  color: activeRoleConfig.color,
                  textTransform: 'uppercase',
                }}
              >
                {activeRoleConfig.label} Mode
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {activeRoleConfig.heading}
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              {activeRoleConfig.subheading}
            </p>
          </div>

          {/* STEP 1: ROLE SELECTION CARDS */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              1. Select Your Stakeholder Role: *
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.45rem' }}>
              {ROLE_OPTIONS.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.key;
                return (
                  <div
                    key={r.key}
                    onClick={() => handleSelectRole(r.key)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${r.color}` : '1px solid #e2e8f0',
                      background: isSelected ? r.bgColor : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: isSelected ? `0 4px 12px ${r.color}25` : 'none',
                      transform: isSelected ? 'scale(1.01)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: r.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                        }}
                      >
                        <Icon size={17} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {r.desc}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: r.color,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Demo Fill Buttons Helper */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem' }}>
              ⚡ Quick Fill Demo Credentials:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleTryDemo(r)}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: selectedRole === r.key ? r.color : '#ffffff',
                    color: selectedRole === r.key ? '#ffffff' : '#334155',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Try {r.label.split('/')[0].trim()} Demo
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              className="animate-fade-in"
              style={{
                padding: '0.75rem 0.9rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#b91c1c',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 2: LOGIN CREDENTIALS FORM */}
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                Email Address:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@pawalert.demo"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                  Password:
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '0.725rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.65rem 2.5rem 0.65rem 2.35rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#475569', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#0d9488' }}
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                marginTop: '0.4rem',
                background: isSubmitDisabled
                  ? '#94a3b8'
                  : `linear-gradient(135deg, ${activeRoleConfig.color}, #0f766e)`,
                boxShadow: isSubmitDisabled ? 'none' : `0 6px 18px ${activeRoleConfig.color}40`,
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              <Lock size={16} />
              {loading ? 'Signing you in...' : `Login as ${activeRoleConfig.label}`}
            </button>
          </form>

          {/* Registration Link */}
          <div style={{ marginTop: '1.25rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#0d9488', fontWeight: 700, textDecoration: 'none' }}>
              Register here →
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password / Demo Accounts Guide Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#0d9488', marginBottom: '0.75rem' }}>
              <KeyRound size={26} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Demo Accounts & Passwords
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              All 5 stakeholder roles are pre-seeded with standardized credentials:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {ROLE_OPTIONS.map((r) => (
                <div
                  key={r.key}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.775rem',
                  }}
                >
                  <div>
                    <strong>{r.label}:</strong> <code style={{ color: '#0f766e' }}>{r.demoEmail}</code>
                  </div>
                  <div>
                    Password: <code style={{ fontWeight: 700, color: '#0f172a' }}>{r.demoPassword}</code>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', fontWeight: 700 }}
            >
              Return to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
