import React, { useEffect, useState } from 'react';
import {
  PawPrint,
  Shield,
  Car,
  HeartHandshake,
  MapPin,
  Sparkles,
  ArrowRight,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Users,
  Compass,
  Volume2,
  RefreshCw,
  Eye,
  Sliders,
  Play,
  RotateCcw,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  LogIn,
  Upload,
  Check,
  Zap,
} from 'lucide-react';
import GisMap from '../components/GisMap';
import RescueTimeline from '../components/RescueTimeline';
import { api } from '../services/api';
import { soundService } from '../services/soundService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDashboardRoute } from '../utils/roles';
import { getAnimalEmoji, getRiskColorClass } from '../utils/geoUtils';

const SAMPLE_AI_PRESETS = [
  {
    type: 'Dog',
    emoji: '🐕',
    label: 'Street Dog Near Highway',
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
    confidence: 0.96,
    breakdown: { Dog: 96, Cat: 3, Cattle: 1 },
  },
  {
    type: 'Cat',
    emoji: '🐈',
    label: 'Kitten on Road Curb',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
    confidence: 0.94,
    breakdown: { Dog: 4, Cat: 94, Cattle: 2 },
  },
  {
    type: 'Cattle',
    emoji: '🐂',
    label: 'Stray Cow on Median',
    url: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&auto=format&fit=crop&q=80',
    confidence: 0.98,
    breakdown: { Dog: 1, Cat: 1, Cattle: 98 },
  },
];

const FAQS = [
  {
    q: 'How does the AI identify animals from road accident photographs?',
    a: 'PawAlert AI uses a Computer Vision Convolutional Neural Network (MobileNetV2 / EfficientNet transfer learning) trained specifically to classify Dog, Cat, and Cattle with high confidence and low inference latency. In demo mode, it provides realistic simulated inference.',
  },
  {
    q: 'How does DBSCAN spatial clustering detect accident hotspots?',
    a: 'Rather than simple bounding boxes, PawAlert AI applies Density-Based Spatial Clustering of Applications with Noise (DBSCAN) using the Haversine formula on historical accident GPS coordinates. It calculates cluster centroids, radii, and counts to classify areas into High, Medium, or Low risk zones.',
  },
  {
    q: 'How does the driver alert system avoid warning spam?',
    a: 'When a driver enters within 350 meters of a known accident hotspot, the system triggers a visual HUD banner and audio siren. An intelligent 10-minute cooldown mechanism ensures drivers are not repeatedly alerted while remaining in the same cluster area.',
  },
  {
    q: 'What is the role of Municipal Authorities and Rescue NGOs?',
    a: 'Municipal authorities use the GIS analytics suite to deploy physical safety remediation (warning signage, street lighting, speed breakers). Rescue NGOs receive real-time dispatch alerts with live medical status tracking from report to recovery.',
  },
  {
    q: 'Are the AI animal classifier and hotspot clustering systems linked?',
    a: 'They serve distinct purposes! The AI classifier identifies the species in the photograph (Dog/Cat/Cattle), while the DBSCAN GIS system clusters geographical coordinate density over time. Both modules work synchronously to power the rescue and prevention pipeline.',
  },
];

export default function LandingPage({ setActiveTab }) {
  const { user, logout, quickSwitchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReports: 23,
    activeHotspots: 3,
    highRiskHotspots: 1,
    completedRescues: 18,
  });
  const [hotspots, setHotspots] = useState([]);
  const [reports, setReports] = useState([]);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState(false);

  // Home Page AI Sandbox State
  const [selectedAiSample, setSelectedAiSample] = useState(SAMPLE_AI_PRESETS[0]);
  const [isScanningAi, setIsScanningAi] = useState(false);
  const [aiScanResult, setAiScanResult] = useState(SAMPLE_AI_PRESETS[0]);

  // Home Page Driver Simulator Widget State
  const [driverSimDistance, setDriverSimDistance] = useState(600); // meters from hotspot
  const [isDriverSimMoving, setIsDriverSimMoving] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statsRes = await api.getOverviewStats();
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      const hotspotsRes = await api.getHotspots();
      if (hotspotsRes.success) {
        setHotspots(hotspotsRes.hotspots || []);
      }
      const reportsRes = await api.getReports({ limit: 20 });
      if (reportsRes.success) {
        setReports(reportsRes.reports || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRoleLaunch = async (roleName) => {
    await quickSwitchDemoRole(roleName);
    if (setActiveTab) setActiveTab(roleName);
    navigate(getDashboardRoute(roleName));
  };

  const handleRecalculateHotspots = async () => {
    setRecalculating(true);
    setRecalcSuccess(false);
    try {
      await api.recalculateHotspots();
      await loadData();
      setRecalcSuccess(true);
      setTimeout(() => setRecalcSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setRecalculating(false);
    }
  };

  // Run AI Scanner Test
  const handleTestAiScan = (sample) => {
    setSelectedAiSample(sample);
    setIsScanningAi(true);
    setTimeout(() => {
      setAiScanResult(sample);
      setIsScanningAi(false);
    }, 1200);
  };

  // Home Page Driver Simulator Runner
  useEffect(() => {
    let timer;
    if (isDriverSimMoving) {
      timer = setInterval(() => {
        setDriverSimDistance((prev) => {
          if (prev <= 120) {
            setIsDriverSimMoving(false);
            soundService.playWarningSiren();
            return 120;
          }
          const next = prev - 40;
          if (next <= 350 && prev > 350) {
            soundService.playWarningSiren();
          }
          return next;
        });
      }, 700);
    }
    return () => clearInterval(timer);
  }, [isDriverSimMoving]);

  const isDriverInDangerZone = driverSimDistance <= 350;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '6rem' }}>
      {/* 1. HERO SECTION */}
      <section
        style={{
          background: 'radial-gradient(circle at 50% 10%, rgba(20, 184, 166, 0.15), transparent 70%), #ffffff',
          padding: '4.5rem 1.5rem 3.5rem 1.5rem',
          textAlign: 'center',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          {/* Civic Tech Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.95rem',
              borderRadius: '999px',
              background: '#ccfbf1',
              color: '#0f766e',
              fontSize: '0.825rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              border: '1px solid #99f6e4',
              boxShadow: '0 2px 6px rgba(13, 148, 136, 0.15)',
            }}
          >
            <Sparkles size={16} /> Intelligent Street Animal Accident Prevention & Rescue Platform
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.3rem, 5vw, 3.8rem)',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.15,
              marginBottom: '1.25rem',
            }}
          >
            Prevent accidents before they happen.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Rescue lives when they do.
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: '#475569',
              lineHeight: 1.6,
              maxWidth: '780px',
              margin: '0 auto 2.25rem auto',
            }}
          >
            An intelligent AI and GIS-powered civic platform for identifying street animals (<strong>Dog, Cat, Cattle</strong>),
            detecting recurring accident hotspots with <strong>DBSCAN spatial clustering</strong>, warning drivers in real time with <strong>350m proximity HUD sirens</strong>, and coordinating rapid <strong>NGO rescue dispatch</strong>.
          </p>

          {/* Authenticated User Status Ribbon */}
          {user && (
            <div
              className="animate-fade-in"
              style={{
                maxWidth: '820px',
                margin: '0 auto 2rem auto',
                background: 'linear-gradient(135deg, rgba(204, 251, 241, 0.85), rgba(224, 242, 254, 0.85))',
                border: '1px solid #99f6e4',
                borderRadius: '16px',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.85rem',
                boxShadow: '0 6px 18px rgba(13, 148, 136, 0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#0d9488',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
                  }}
                >
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Welcome, {user.name}!</span>
                    <span
                      style={{
                        fontSize: '0.685rem',
                        fontWeight: 700,
                        color: '#0f766e',
                        background: '#ccfbf1',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        border: '1px solid #99f6e4',
                      }}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '1px' }}>
                    Active session. Explore the GIS hotspot radar or jump directly to your dashboard.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => navigate(getDashboardRoute(user.role))}
                  className="btn btn-sm btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', fontWeight: 700 }}
                >
                  <Sparkles size={14} /> My {user.role?.toUpperCase()} Dashboard
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-sm btn-secondary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.4rem 0.75rem',
                    color: '#ef4444',
                    borderColor: '#fecaca',
                    background: '#ffffff',
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* 4 Primary Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '3rem',
            }}
          >
            <button
              onClick={() => handleRoleLaunch('citizen')}
              className="btn btn-lg btn-primary"
              style={{ boxShadow: '0 8px 22px rgba(13, 148, 136, 0.35)' }}
            >
              <PawPrint size={20} /> Report an Animal Accident
            </button>

            <button
              onClick={() => {
                const mapSec = document.getElementById('safety-radar-map');
                if (mapSec) mapSec.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn btn-lg btn-secondary"
            >
              <Shield size={20} color="#0d9488" /> Explore Safety Radar Map
            </button>

            <button
              onClick={() => handleRoleLaunch('driver')}
              className="btn btn-lg btn-secondary"
              style={{ background: '#f0f9ff', borderColor: '#bae6fd', color: '#0284c7' }}
            >
              <Car size={20} /> Driver Safety HUD Demo
            </button>

            {user ? (
              <button
                onClick={() => navigate(getDashboardRoute(user.role))}
                className="btn btn-lg btn-secondary"
                style={{ background: '#ffffff', borderColor: '#99f6e4', color: '#0d9488', fontWeight: 700 }}
              >
                <Sparkles size={20} color="#0d9488" /> Go to {user.role?.toUpperCase()} Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="btn btn-lg btn-secondary"
                style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
              >
                <LogIn size={20} /> Sign In / Register
              </button>
            )}
          </div>

          {/* Key Metrics Counter Grid */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#ccfbf1', color: '#0d9488' }}>
                <Activity size={24} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                  {stats.totalReports || 23}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  Total Accident Reports
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
                <AlertTriangle size={24} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                  {stats.activeHotspots || 3}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  DBSCAN Hotspots
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Shield size={24} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                  {stats.highRiskHotspots || 1}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  High-Risk Red Zones
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <HeartHandshake size={24} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                  {stats.completedRescues || 18}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  Rescued & Treated
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE LIVE AI ANIMAL CLASSIFICATION SANDBOX (HOME PAGE FEATURE) */}
      <section style={{ maxWidth: '1200px', margin: '3.5rem auto', padding: '0 1.5rem' }}>
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #ffffff, #f0fdfa)',
            border: '1px solid #99f6e4',
            padding: '2rem',
            boxShadow: '0 12px 30px rgba(13, 148, 136, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0d9488', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <Cpu size={16} /> Interactive Computer Vision Model Sandbox
              </div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>
                Live AI Animal Identification (Dog, Cat, Cattle)
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Try our trained classifier directly on this page. Click a test sample below to watch real-time neural network inference.
              </p>
            </div>

            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                background: '#ccfbf1',
                color: '#0f766e',
                border: '1px solid #5eead4',
              }}
            >
              ⚡ TensorFlow / MobileNetV2 Active
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', alignItems: 'center' }}>
            {/* Left: Sample Image Picker & Interactive Scan Beam */}
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {SAMPLE_AI_PRESETS.map((p) => (
                  <button
                    key={p.type}
                    onClick={() => handleTestAiScan(p)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: selectedAiSample.type === p.type ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: selectedAiSample.type === p.type ? '#f0fdfa' : '#ffffff',
                      fontWeight: selectedAiSample.type === p.type ? 700 : 500,
                      fontSize: '0.8rem',
                      color: selectedAiSample.type === p.type ? '#0f766e' : '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>{p.emoji}</span> {p.type}
                  </button>
                ))}
              </div>

              {/* Photo Display with Scanning Animation */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '240px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  border: '1px solid #cbd5e1',
                }}
              >
                <img
                  src={selectedAiSample.url}
                  alt={selectedAiSample.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {isScanningAi && <div className="scan-line" />}

                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.85), transparent)',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{selectedAiSample.label}</span>
                  <span style={{ fontSize: '0.7rem', color: '#2dd4bf' }}>Resolution: 600x400</span>
                </div>
              </div>
            </div>

            {/* Right: Real-Time Prediction & Confidence Breakdown */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Model Prediction Output:
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#0d9488',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle2 size={15} /> Verified Inference
                </span>
              </div>

              {/* Detected Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  background: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontSize: '2.5rem' }}>{aiScanResult.emoji}</div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Identified: {aiScanResult.type}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#0d9488', fontWeight: 700 }}>
                    Confidence: {(aiScanResult.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Confidence Breakdown Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                {Object.entries(aiScanResult.breakdown).map(([animal, pct]) => (
                  <div key={animal}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                      <span>{getAnimalEmoji(animal)} {animal}</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: animal === aiScanResult.type ? 'linear-gradient(90deg, #0d9488, #14b8a6)' : '#94a3b8',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleRoleLaunch('citizen')}
                className="btn btn-primary"
                style={{ width: '100%', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)' }}
              >
                <PawPrint size={16} /> Report Accident with this AI Detection →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE GIS SAFETY RADAR MAP */}
      <section id="safety-radar-map" style={{ maxWidth: '1200px', margin: '3.5rem auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase' }}>
              Live GIS Radar Map
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              Real-Time Accident Hotspots & Spatial Clusters
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Visualizing density-based geographical clusters (DBSCAN) across high-risk transportation corridors.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleRecalculateHotspots}
              disabled={recalculating}
              className="btn btn-sm btn-secondary"
              style={{ background: recalcSuccess ? '#dcfce7' : '#ffffff', color: recalcSuccess ? '#16a34a' : '#0f172a' }}
            >
              {recalcSuccess ? <Check size={14} /> : <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />}
              {recalculating ? 'Clustering...' : recalcSuccess ? 'DBSCAN Synced!' : 'Re-run DBSCAN'}
            </button>

            <button
              onClick={() => handleRoleLaunch('authority')}
              className="btn btn-sm btn-primary"
            >
              Open Authority GIS Suite <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <GisMap
          hotspots={hotspots}
          reports={reports}
          height="460px"
        />
      </section>

      {/* 4. DBSCAN SPATIAL CLUSTERING & DRIVER HUD INTERACTIVE EXPLAINER */}
      <section style={{ background: '#f8fafc', padding: '4rem 1.5rem', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
              Spatial Intelligence & Safety Tech
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
              DBSCAN Hotspots & Live Driver Proximity Siren
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '680px', margin: '0.5rem auto 0 auto' }}>
              PawAlert AI mathematically groups accident coordinates using DBSCAN clustering, and warns approaching drivers within 350 meters.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
            {/* Left: DBSCAN Clustering Explainer */}
            <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Layers size={22} color="#7c3aed" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  DBSCAN Spatial Clustering
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                Density-Based Spatial Clustering of Applications with Noise (DBSCAN) analyzes geographical coordinates of historical accident reports.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>1. Haversine Distance Metric:</strong>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Converts GPS latitude and longitude into accurate geographical meters before clustering.
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>2. Centroid & Radius Computation:</strong>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Identifies dense clusters without requiring a fixed cluster count (k) beforehand.
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>3. Dynamic Risk Classification:</strong>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '4px' }}>
                    <span className="badge badge-risk-high">HIGH (10+ reports)</span>
                    <span className="badge badge-risk-med">MED (5–9 reports)</span>
                    <span className="badge badge-risk-low">LOW (2–4 reports)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleRoleLaunch('authority')}
                className="btn btn-outline"
                style={{ width: '100%' }}
              >
                Inspect DBSCAN Density Analytics →
              </button>
            </div>

            {/* Right: Driver Proximity Siren Simulator Widget */}
            <div
              className={isDriverInDangerZone ? 'card siren-active' : 'card'}
              style={{
                background: isDriverInDangerZone ? '#fef2f2' : '#ffffff',
                border: `2px solid ${isDriverInDangerZone ? '#ef4444' : '#e2e8f0'}`,
                padding: '1.75rem',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Car size={22} color={isDriverInDangerZone ? '#ef4444' : '#0284c7'} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                    Driver Safety HUD Simulator
                  </h3>
                </div>
                <span className={`badge ${isDriverInDangerZone ? 'badge-risk-high' : 'badge-risk-low'}`}>
                  {isDriverInDangerZone ? '🚨 SIREN ACTIVE' : '🛡️ SAFE'}
                </span>
              </div>

              {/* Status Alert Banner */}
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: isDriverInDangerZone ? '#fee2e2' : '#f0fdf4',
                  border: `1px solid ${isDriverInDangerZone ? '#fca5a5' : '#bbf7d0'}`,
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isDriverInDangerZone ? '#991b1b' : '#166534' }}>
                  {isDriverInDangerZone
                    ? '🚨 ANIMAL ACCIDENT HOTSPOT AHEAD (South Bypass)'
                    : '🛡️ Road Safe & Clear (No immediate hotspots)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: isDriverInDangerZone ? '#b91c1c' : '#15803d', marginTop: '2px' }}>
                  {isDriverInDangerZone
                    ? '11 previous animal accidents in this zone. Reduce speed to 30 km/h.'
                    : 'Driver GPS active. 350m radar proximity scanning enabled.'}
                </div>
              </div>

              {/* Distance Slider / Simulation Controls */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                  <span>Distance to Hotspot Center:</span>
                  <strong style={{ color: isDriverInDangerZone ? '#ef4444' : '#0f172a', fontSize: '0.95rem' }}>
                    {driverSimDistance} meters
                  </strong>
                </div>

                <input
                  type="range"
                  min="50"
                  max="800"
                  value={driverSimDistance}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setDriverSimDistance(val);
                    if (val <= 350 && driverSimDistance > 350) {
                      soundService.playWarningSiren();
                    }
                  }}
                  style={{ width: '100%', accentColor: isDriverInDangerZone ? '#ef4444' : '#0284c7', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                  <span>800m (Far away)</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>350m Warning Radius</span>
                  <span>50m (Inside Hotspot)</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setIsDriverSimMoving(!isDriverSimMoving)}
                  className="btn btn-primary"
                  style={{ flex: 1, background: isDriverInDangerZone ? '#ef4444' : '#0284c7', borderColor: isDriverInDangerZone ? '#ef4444' : '#0284c7' }}
                >
                  {isDriverSimMoving ? 'Pause Simulated Vehicle' : <><Play size={15} /> Simulate Approaching Hotspot</>}
                </button>
                <button
                  onClick={() => {
                    setIsDriverSimMoving(false);
                    setDriverSimDistance(600);
                  }}
                  className="btn btn-secondary"
                  title="Reset to 600m"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW PAWALERT AI WORKS (6-STEP WORKFLOW) */}
      <section style={{ background: '#ffffff', padding: '4.5rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase' }}>
            End-to-End Architecture
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '2.5rem' }}>
            How PawAlert AI Saves Lives
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
            <div className="card" style={{ borderTop: '4px solid #0d9488' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📷</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                1. AI Animal Identification
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                Citizen uploads a photo from the road. The AI classifies whether the animal is a <strong>Dog</strong>, <strong>Cat</strong>, or <strong>Cattle</strong> with confidence scoring.
              </p>
            </div>

            <div className="card" style={{ borderTop: '4px solid #0284c7' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🗄️</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                2. Geo-Tagged Database Storage
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                GPS coordinates, timestamp, description, severity, and photo are stored permanently in MongoDB with duplicate detection.
              </p>
            </div>

            <div className="card" style={{ borderTop: '4px solid #ef4444' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🧠</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                3. DBSCAN Hotspot Clustering
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                Historical accident coordinates are mathematically grouped using DBSCAN and Haversine distance, identifying high-risk cluster centroids and radii.
              </p>
            </div>

            <div className="card" style={{ borderTop: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🚗</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                4. Live Driver Safety HUD
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                Drivers approaching within 350m of a high-risk hotspot receive emergency audio/visual siren alerts with 10-minute anti-spam cooldown.
              </p>
            </div>

            <div className="card" style={{ borderTop: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🏛️</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                5. Municipal Remediation
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                Authorities monitor accident density heatmaps, assign safety actions (signage, lighting, speed breakers), and track remediation progress.
              </p>
            </div>

            <div className="card" style={{ borderTop: '4px solid #10b981' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🐾</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                6. NGO Rescue Dispatch
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                Rescue squads are notified instantly, dispatching field volunteers and tracking medical recovery across a 7-stage live timeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. NGO RESCUE PIPELINE & 7-STAGE TIMELINE SHOWCASE */}
      <section style={{ maxWidth: '1100px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
            Rescue Lifecycle
          </span>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
            7-Stage Live Emergency Rescue Pipeline
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '600px', margin: '0.25rem auto 0 auto' }}>
            Citizens and NGOs track animal rescue operations with real-time updates and veterinary notes.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem', background: '#ffffff' }}>
          <RescueTimeline
            currentStatus="On the Way"
            statusHistory={[
              { status: 'Requested', updatedBy: 'Citizen Reporter', notes: 'Accident reported near South Bypass Highway.', timestamp: new Date(Date.now() - 3600000) },
              { status: 'Assigned', updatedBy: 'PawAlert Dispatch', notes: 'Assigned to PawsCare Animal Rescue Squad 2.', timestamp: new Date(Date.now() - 2400000) },
              { status: 'Accepted', updatedBy: 'Squad Lead', notes: 'Rescue team accepted dispatch order.', timestamp: new Date(Date.now() - 1800000) },
              { status: 'On the Way', updatedBy: 'Ambulance Driver', notes: 'Ambulance en route. ETA 8 minutes.', timestamp: new Date(Date.now() - 600000) },
            ]}
          />
        </div>
      </section>

      {/* 7. DEDICATED STAKEHOLDER PORTALS SHOWCASE */}
      <section style={{ maxWidth: '1100px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase' }}>
          Multi-Stakeholder Experience
        </span>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
          Explore Dedicated Portals
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2.5rem' }}>
          Experience PawAlert AI tailored to every role in the civic safety ecosystem:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div
            onClick={() => handleRoleLaunch('citizen')}
            className="card"
            style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
          >
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>👤</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Citizen Portal</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Report accidents, AI image scan, track active rescues.
            </p>
          </div>

          <div
            onClick={() => handleRoleLaunch('driver')}
            className="card"
            style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
          >
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🚗</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Driver Safety HUD</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Simulate GPS driving, receive proximity siren warnings.
            </p>
          </div>

          <div
            onClick={() => handleRoleLaunch('authority')}
            className="card"
            style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
          >
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🏛️</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Authority GIS</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Analyze hotspot density, manage municipal actions.
            </p>
          </div>

          <div
            onClick={() => handleRoleLaunch('ngo')}
            className="card"
            style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
          >
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🐾</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>NGO Rescue Queue</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Coordinate ambulances, assign volunteers, log recovery.
            </p>
          </div>

          <div
            onClick={() => handleRoleLaunch('admin')}
            className="card"
            style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
          >
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>⚙️</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>System Admin</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Tune DBSCAN epsilon/minPts, inspect system health.
            </p>
          </div>
        </div>
      </section>

      {/* 8. ARCHITECTURAL PRINCIPLE: SECTION 42 EXPLAINER */}
      <section style={{ maxWidth: '1100px', margin: '3.5rem auto', padding: '0 1.5rem' }}>
        <div
          style={{
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Zap size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              PawAlert AI Core Architectural Principle
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            To prevent system confusion, PawAlert AI strictly separates image classification from geographical hotspot intelligence:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <strong style={{ fontSize: '0.9rem', color: '#38bdf8', display: 'block', marginBottom: '4px' }}>
                1. Animal AI Model Dataset
              </strong>
              <p style={{ fontSize: '0.775rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                Used strictly for: <em>Photo → Dog / Cat / Cattle Identification</em>.
                The classifier identifies species characteristics and does NOT determine geographical coordinates.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <strong style={{ fontSize: '0.9rem', color: '#2dd4bf', display: 'block', marginBottom: '4px' }}>
                2. Accident Report Database
              </strong>
              <p style={{ fontSize: '0.775rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                Used strictly for: <em>Historical GPS Points → DBSCAN Hotspot Detection</em>.
                DBSCAN clusters incident density over time to warn approaching drivers and guide municipality remediation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FREQUENTLY ASKED QUESTIONS */}
      <section style={{ maxWidth: '900px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase' }}>
            Knowledge Base
          </span>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    color: '#0f172a',
                  }}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} color="#0d9488" /> : <ChevronDown size={18} color="#64748b" />}
                </button>
                {isOpen && (
                  <div style={{ padding: '0 1.25rem 1rem 1.25rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. CIVIC-TECH FOOTER */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '3.5rem 1.5rem 2rem 1.5rem', marginTop: '4rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0d9488', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PawPrint size={20} />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>PawAlert AI</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Intelligent civic-tech platform for street animal accident prevention, DBSCAN hotspot detection, driver warnings, and rescue management.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Quick Portals</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleRoleLaunch('citizen'); }} style={{ color: 'inherit', textDecoration: 'none' }}>Citizen Reporting</a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleRoleLaunch('driver'); }} style={{ color: 'inherit', textDecoration: 'none' }}>Driver Safety HUD</a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleRoleLaunch('authority'); }} style={{ color: 'inherit', textDecoration: 'none' }}>Authority GIS Map</a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleRoleLaunch('ngo'); }} style={{ color: 'inherit', textDecoration: 'none' }}>NGO Rescue Queue</a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleRoleLaunch('admin'); }} style={{ color: 'inherit', textDecoration: 'none' }}>Admin Controls</a>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Technology Stack</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              <span className="badge badge-teal">TensorFlow</span>
              <span className="badge badge-teal">FastAPI</span>
              <span className="badge badge-teal">DBSCAN</span>
              <span className="badge badge-teal">Leaflet GIS</span>
              <span className="badge badge-teal">React 18</span>
              <span className="badge badge-teal">Node.js</span>
              <span className="badge badge-teal">MongoDB</span>
              <span className="badge badge-teal">Web Audio API</span>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Emergency Helpline</h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
              24/7 Street Animal Rescue Dispatch:
            </p>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d9488' }}>
              📞 1800-PAW-ALERT
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
              Tirunelveli & Metro Transit Corridors
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
          © {new Date().getFullYear()} PawAlert AI. Intelligent Street Animal Accident Prevention & Rescue Management System.
        </div>
      </footer>
    </div>
  );
}
