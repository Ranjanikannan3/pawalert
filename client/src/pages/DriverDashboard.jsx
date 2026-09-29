import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  Navigation,
  ShieldAlert,
  Volume2,
  VolumeX,
  Volume1,
  Compass,
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Bell,
  User,
  MapPin,
  Radio,
  Sparkles,
  Zap,
  Info,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Flame,
  Clock,
  Send,
} from 'lucide-react';
import GisMap from '../components/GisMap';
import DriverAlertModal from '../components/DriverAlertModal';
import RoleDashboardLayout from '../components/RoleDashboardLayout';
import { api } from '../services/api';
import { soundService, SIREN_PROFILES } from '../services/soundService';
import { formatDistance, getRiskColorClass, getAnimalEmoji, calculateDistance } from '../utils/geoUtils';
import { subscribeToLiveEvents } from '../services/socket';

// Preset simulation routes for demonstration & testing
const SIMULATION_SCENARIOS = [
  {
    id: 'approach_high_risk',
    name: '🚨 Approach High-Risk Hotspot (South Bypass - 5 Dogs, 2 Cattle)',
    startLat: 8.7115,
    startLng: 77.7550,
    targetLat: 8.7138,
    targetLng: 77.7568,
    speed: 55,
    risk: 'HIGH',
    zone: 'South Bypass Road Corridor',
  },
  {
    id: 'approach_med_risk',
    name: '🟡 Approach Medium-Risk Hotspot (Central Market Area)',
    startLat: 8.7250,
    startLng: 77.7350,
    targetLat: 8.7285,
    targetLng: 77.7380,
    speed: 40,
    risk: 'MEDIUM',
    zone: 'Market Junction & Bus Stand',
  },
  {
    id: 'approach_night_cattle',
    name: '🔴 Approach Cattle Crossing (Low Visibility Night Route)',
    startLat: 8.7420,
    startLng: 77.7200,
    targetLat: 8.7455,
    targetLng: 77.7240,
    speed: 50,
    risk: 'HIGH',
    zone: 'Northern Industrial Belt',
  },
  {
    id: 'safe_corridor',
    name: '🟢 Safe Highway Corridor (No Hotspots Detected)',
    startLat: 8.7500,
    startLng: 77.7000,
    targetLat: 8.7550,
    targetLng: 77.7050,
    speed: 65,
    risk: 'LOW',
    zone: 'Outer Ring Expressway',
  },
];

export default function DriverDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [driverPos, setDriverPos] = useState({
    latitude: 8.7115,
    longitude: 77.7550,
    speed: 48,
    heading: 42,
  });

  const [isLiveGpsActive, setIsLiveGpsActive] = useState(false);
  const [hotspots, setHotspots] = useState([]);
  const [reports, setReports] = useState([]);
  const [nearbyHotspots, setNearbyHotspots] = useState([]);
  const [safetyStatus, setSafetyStatus] = useState({
    level: 'SAFE',
    message: 'Analyzing local road corridor...',
    closestHotspot: null,
  });
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [currentAlertModal, setCurrentAlertModal] = useState(null);
  const [alertHistory, setAlertHistory] = useState([
    {
      alertId: 'DEMO-ALERT-01',
      hotspotName: 'South Bypass Corridor (HS-001)',
      distanceMeters: 280,
      riskLevel: 'HIGH',
      triggeredAt: new Date(Date.now() - 1000 * 60 * 14).toLocaleTimeString(),
    },
    {
      alertId: 'DEMO-ALERT-02',
      hotspotName: 'Market Junction (HS-002)',
      distanceMeters: 310,
      riskLevel: 'MEDIUM',
      triggeredAt: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString(),
    },
  ]);

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(SIMULATION_SCENARIOS[0]);
  const [simProgress, setSimProgress] = useState(0); // 0% to 100%

  // Sound & Alarm States
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(soundService.getVolume());
  const [selectedProfile, setSelectedProfile] = useState(soundService.getProfile());
  const [isAlarmLoopActive, setIsAlarmLoopActive] = useState(false);
  const [continuousLoopEnabled, setContinuousLoopEnabled] = useState(true);
  const [warningThresholdRadius, setWarningThresholdRadius] = useState(350); // meters

  // Filter state for Hotspots tab
  const [hotspotFilter, setHotspotFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'High-Density Hotspot Notice',
      message: 'Municipal authority deployed 4 warning reflectors along South Bypass Road.',
      time: '1 hour ago',
      type: 'info',
      read: false,
    },
    {
      id: 'n2',
      title: 'Night Speed Advisory',
      message: 'Reduced speed limit (30 km/h) active between 8:00 PM and 6:00 AM near cattle crossings.',
      time: '3 hours ago',
      type: 'warning',
      read: false,
    },
  ]);

  // Automatically mark all notifications as read when viewing the notifications tab
  useEffect(() => {
    if (activeSection === 'notifications') {
      const hasUnread = notifications.some((n) => !n.read);
      if (hasUnread) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    }
  }, [activeSection, notifications]);

  // Initial load and live Socket.IO connection
  useEffect(() => {
    loadHotspots();
    loadReports();
    updateLocationOnServer(driverPos.latitude, driverPos.longitude, driverPos.speed);

    // Live Socket.IO listener for recalculated hotspots & new reports
    const unsubscribe = subscribeToLiveEvents({
      onHotspotUpdate: (data) => {
        console.log('⚡ [Driver Live Sync] Hotspots recalculated:', data);
        loadHotspots();
      },
      onNewReport: (data) => {
        console.log('⚡ [Driver Live Sync] New accident report received:', data);
        loadHotspots();
        loadReports();
      },
    });

    const pollTimer = setInterval(() => {
      loadHotspots();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, []);

  // Live Device GPS Watcher
  useEffect(() => {
    let watchId = null;
    if (isLiveGpsActive && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(5));
          const lng = parseFloat(pos.coords.longitude.toFixed(5));
          const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 35; // m/s to km/h
          const heading = pos.coords.heading || 0;

          setDriverPos({ latitude: lat, longitude: lng, speed, heading });
          updateLocationOnServer(lat, lng, speed);
        },
        (err) => {
          console.warn('Live GPS watch error:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    }
    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isLiveGpsActive]);

  // Update server with driver GPS & check proximity
  const updateLocationOnServer = async (lat, lng, speed = 48, bypass = false) => {
    try {
      const res = await api.updateDriverLocation({
        latitude: lat,
        longitude: lng,
        speed,
        bypassCooldown: bypass,
      });

      if (res.success) {
        setSafetyStatus(res.safetyStatus);
        if (res.nearbyHotspots) {
          setNearbyHotspots(res.nearbyHotspots);
        }
        if (res.activeAlerts && res.activeAlerts.length > 0) {
          const newAlert = res.activeAlerts[0];
          setCurrentAlertModal(newAlert);
          setAlertHistory((prev) => [
            {
              ...newAlert,
              triggeredAt: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 14),
          ]);

          // Play alarm sound automatically when alert triggers
          if (soundEnabled) {
            soundService.playWarningSiren(selectedProfile);
          }
        }
      }
    } catch (e) {
      console.warn('Driver location update notice:', e.message);
    }
  };

  const loadHotspots = async () => {
    try {
      const res = await api.getHotspots();
      if (res.success) {
        setHotspots(res.hotspots || []);
      }
    } catch (e) {}
  };

  const loadReports = async () => {
    try {
      const res = await api.getReports({ limit: 10 });
      if (res.success) {
        setReports(res.reports || []);
      }
    } catch (e) {}
  };

  const driveToIncident = (report) => {
    const lat = report.latitude;
    const lng = report.longitude;
    setDriverPos({ latitude: lat, longitude: lng, speed: 45, heading: 90 });
    updateLocationOnServer(lat, lng, 45, true);
    if (soundEnabled) {
      soundService.playWarningSiren(selectedProfile);
    }
  };

  // Check if driver is currently in danger zone (< 350m) and manage continuous alarm
  const isDanger =
    safetyStatus.level === 'HIGH_RISK' ||
    safetyStatus.level === 'WARNING' ||
    (safetyStatus.closestHotspot && safetyStatus.closestHotspot.distanceMeters <= warningThresholdRadius);

  useEffect(() => {
    if (isDanger && soundEnabled && continuousLoopEnabled) {
      soundService.startContinuousAlarm(3000);
      setIsAlarmLoopActive(true);
    } else {
      soundService.stopContinuousAlarm();
      setIsAlarmLoopActive(false);
    }
    return () => {
      soundService.stopContinuousAlarm();
    };
  }, [isDanger, soundEnabled, continuousLoopEnabled, selectedProfile]);

  // Simulation step runner
  useEffect(() => {
    let timer;
    if (isSimulating) {
      timer = setInterval(() => {
        setSimProgress((prev) => {
          if (prev >= 100) {
            setIsSimulating(false);
            return 100;
          }
          const next = prev + 5;
          const factor = next / 100;
          const newLat =
            selectedScenario.startLat +
            (selectedScenario.targetLat - selectedScenario.startLat) * factor;
          const newLng =
            selectedScenario.startLng +
            (selectedScenario.targetLng - selectedScenario.startLng) * factor;

          setDriverPos((p) => ({
            ...p,
            latitude: parseFloat(newLat.toFixed(5)),
            longitude: parseFloat(newLng.toFixed(5)),
            speed: selectedScenario.speed,
          }));

          updateLocationOnServer(newLat, newLng, selectedScenario.speed);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSimulating, selectedScenario]);

  const handleScenarioChange = (scenario) => {
    setSelectedScenario(scenario);
    setIsSimulating(false);
    setSimProgress(0);
    setDriverPos({
      latitude: scenario.startLat,
      longitude: scenario.startLng,
      speed: scenario.speed,
      heading: 45,
    });
    updateLocationOnServer(scenario.startLat, scenario.startLng, scenario.speed);
  };

  const handleSliderProgress = (val) => {
    const factor = val / 100;
    setSimProgress(val);
    const newLat =
      selectedScenario.startLat +
      (selectedScenario.targetLat - selectedScenario.startLat) * factor;
    const newLng =
      selectedScenario.startLng +
      (selectedScenario.targetLng - selectedScenario.startLng) * factor;

    setDriverPos((p) => ({
      ...p,
      latitude: parseFloat(newLat.toFixed(5)),
      longitude: parseFloat(newLng.toFixed(5)),
      speed: selectedScenario.speed,
    }));
    updateLocationOnServer(newLat, newLng, selectedScenario.speed);
  };

  // Sound handlers
  const handleSelectSoundProfile = (profileId) => {
    setSelectedProfile(profileId);
    soundService.setProfile(profileId);
    if (soundEnabled) {
      soundService.playWarningSiren(profileId);
    }
  };

  const handleTestCurrentSound = () => {
    soundService.playWarningSiren(selectedProfile);
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    soundService.setVolume(newVol);
    if (newVol > 0 && !soundEnabled) {
      setSoundEnabled(true);
    }
  };

  const handleTeleportToHotspot = (hotspot) => {
    const targetLat = hotspot.centroid ? hotspot.centroid.coordinates[1] : hotspot.latitude;
    const targetLng = hotspot.centroid ? hotspot.centroid.coordinates[0] : hotspot.longitude;

    if (targetLat && targetLng) {
      // Place driver 150m away to trigger the alarm
      const testLat = parseFloat((targetLat - 0.0012).toFixed(5));
      const testLng = parseFloat((targetLng - 0.0012).toFixed(5));
      setDriverPos({
        latitude: testLat,
        longitude: testLng,
        speed: 45,
        heading: 90,
      });
      setIsSimulating(false);
      updateLocationOnServer(testLat, testLng, 45);
      setActiveSection('overview');
    }
  };

  // Filter nearby hotspots
  const filteredHotspots = (nearbyHotspots.length > 0 ? nearbyHotspots : hotspots).filter((h) => {
    const matchesFilter =
      hotspotFilter === 'ALL' ||
      (h.riskLevel && h.riskLevel.toUpperCase() === hotspotFilter.toUpperCase());
    const matchesSearch =
      !searchQuery ||
      (h.name && h.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (h.hotspotId && h.hotspotId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const unreadDriverNotifications = notifications.filter((n) => !n.read).length;

  // Driver Sidebar Navigation items matching PAWALERT _AI.md Section 9
  const driverNav = [
    { key: 'overview', label: 'Dashboard', icon: Car },
    { key: 'safety-map', label: 'Live Safety Map', icon: Navigation },
    {
      key: 'hotspots',
      label: 'Nearby Hotspots',
      icon: MapPin,
      badge: nearbyHotspots.length > 0 ? nearbyHotspots.length : null,
      badgeColor: '#0284c7',
    },
    {
      key: 'alerts',
      label: 'Alarm & Siren Radar',
      icon: ShieldAlert,
      badge: isDanger ? 'DANGER' : null,
      badgeColor: '#ef4444',
    },
    { key: 'history', label: 'Alert History', icon: Activity },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: activeSection === 'notifications' ? null : (unreadDriverNotifications > 0 ? unreadDriverNotifications : null),
      badgeColor: '#ef4444',
    },
    { key: 'profile', label: 'Driver Profile', icon: User },
  ];

  return (
    <RoleDashboardLayout
      role="driver"
      navItems={driverNav}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Emergency Alert Modal Popup */}
        {currentAlertModal && (
          <DriverAlertModal
            alert={currentAlertModal}
            onClose={() => setCurrentAlertModal(null)}
            soundEnabled={soundEnabled}
          />
        )}

        {/* TOP STATUS & HEADER BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#0284c7',
                fontWeight: 700,
                fontSize: '0.825rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <Car size={18} /> Real-Time Vehicle Proximity & Alarm HUD
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {activeSection === 'overview' && 'Active Vehicle Safety Radar'}
              {activeSection === 'safety-map' && 'Full-Screen Live Safety Map'}
              {activeSection === 'hotspots' && 'Nearby Animal Accident Hotspots'}
              {activeSection === 'alerts' && 'Alarm Sound & Siren Controls'}
              {activeSection === 'history' && 'Proximity Alert Logs & History'}
              {activeSection === 'notifications' && 'Driver Safety Broadcasts'}
              {activeSection === 'profile' && 'Driver Vehicle Profile & Sensors'}
            </h1>
          </div>

          {/* Quick Alarm Controls & Live GPS Tracker in Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const nextState = !isLiveGpsActive;
                setIsLiveGpsActive(nextState);
                if (nextState) {
                  setIsSimulating(false);
                }
              }}
              className="btn btn-sm"
              style={{
                background: isLiveGpsActive ? '#10b981' : '#ffffff',
                color: isLiveGpsActive ? '#ffffff' : '#047857',
                border: isLiveGpsActive ? '1px solid #10b981' : '1px solid #a7f3d0',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
              }}
              title="Track live hardware GPS device location"
            >
              <Navigation size={16} className={isLiveGpsActive ? 'animate-pulse' : ''} />
              <span>{isLiveGpsActive ? '🛰️ Live Device GPS: ON' : '🛰️ Track Device Real GPS'}</span>
            </button>

            <button
              onClick={handleTestCurrentSound}
              className="btn btn-sm btn-secondary"
              style={{
                background: '#ffffff',
                color: '#0284c7',
                borderColor: '#bae6fd',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.1)',
              }}
              title="Test warning sound tone"
            >
              <Volume2 size={16} color="#0284c7" />
              <span>Test Alarm Sound</span>
            </button>

            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) {
                  soundService.playWarningSiren();
                } else {
                  soundService.stopContinuousAlarm();
                }
              }}
              className="btn btn-sm"
              style={{
                background: soundEnabled ? '#0284c7' : '#f1f5f9',
                color: soundEnabled ? '#ffffff' : '#64748b',
                border: soundEnabled ? '1px solid #0284c7' : '1px solid #cbd5e1',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundEnabled ? 'Siren Audio ON' : 'Siren Muted'}</span>
            </button>

            {isAlarmLoopActive && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  background: '#fef2f2',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                <Flame size={14} /> ALARM LOOPING
              </div>
            )}
          </div>
        </div>

        {/* ================= SECTION 1: OVERVIEW HUD ================= */}
        {activeSection === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. MASTER HAZARD / SAFETY HUD BANNER */}
            <div
              className={isDanger ? 'card siren-active' : 'card'}
              style={{
                background: isDanger ? '#fef2f2' : '#f0fdf4',
                border: `2px solid ${isDanger ? '#ef4444' : '#86efac'}`,
                padding: '1.25rem 1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                borderRadius: '16px',
                boxShadow: isDanger ? '0 0 25px rgba(239,68,68,0.25)' : '0 4px 12px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div
                  style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '50%',
                    background: isDanger ? '#ef4444' : '#22c55e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isDanger ? '0 0 24px rgba(239,68,68,0.7)' : 'none',
                    flexShrink: 0,
                  }}
                >
                  {isDanger ? (
                    <ShieldAlert size={32} />
                  ) : (
                    <CheckCircle2 size={32} />
                  )}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      color: isDanger ? '#ef4444' : '#15803d',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isDanger
                      ? '🚨 HIGH ANIMAL ACCIDENT RISK ZONE • SIREN ACTIVE'
                      : safetyStatus.level === 'CAUTION'
                      ? '⚠️ APPROACHING ANIMAL ACCIDENT HOTSPOT'
                      : '🛡️ ROAD SAFE & CLEAR • NO PROXIMITY HAZARDS'}
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '3px 0' }}>
                    {safetyStatus.message}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                    <span>📍 GPS: <strong>{driverPos?.latitude != null ? Number(driverPos.latitude).toFixed(4) : '8.7115'}, {driverPos?.longitude != null ? Number(driverPos.longitude).toFixed(4) : '77.7550'}</strong></span>
                    <span>⚡ Speed: <strong>{driverPos?.speed || 0} km/h</strong></span>
                    <span>📡 Warning Radius: <strong>{warningThresholdRadius}m</strong></span>
                  </div>
                </div>
              </div>

              {safetyStatus.closestHotspot && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Distance to Hotspot
                  </span>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: isDanger ? '#ef4444' : '#0f172a', lineHeight: 1.1 }}>
                    {formatDistance(safetyStatus.closestHotspot.distanceMeters)}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <span className={`badge ${getRiskColorClass(safetyStatus.closestHotspot.riskLevel)}`}>
                      {safetyStatus.closestHotspot.riskLevel} RISK
                    </span>
                    <span className="badge badge-gray">
                      {safetyStatus.closestHotspot.reportCount || 5} Incidents
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* FRONT PROMINENT CARD: RECENTLY FILED CITIZEN ACCIDENTS & PROXIMITY RADAR */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', border: '2px solid #bae6fd', background: '#ffffff', boxShadow: '0 4px 20px rgba(2, 132, 199, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🚨 Citizen-Filed Accident Reports & Fixed Danger Zones
                    </h3>
                    <p style={{ fontSize: '0.775rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Accident locations submitted by citizens establish fixed 350m danger zones. Approaching triggers your safety alarm siren.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#059669', background: '#d1fae5', padding: '0.3rem 0.65rem', borderRadius: '999px', fontWeight: 700 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                    GPS Radar Active
                  </div>
                  <span className="badge badge-teal">{reports.length} Filed Incidents</span>
                </div>
              </div>

              {reports.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    No accident reports filed yet. When citizens file complaints, they will appear here with live distance and siren trigger.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                  {reports.slice(0, 4).map((r) => {
                    const dist = calculateDistance(driverPos.latitude, driverPos.longitude, r.latitude, r.longitude);
                    const isInsideHotspot = dist <= warningThresholdRadius;
                    return (
                      <div
                        key={r._id}
                        style={{
                          padding: '1.15rem',
                          borderRadius: '14px',
                          background: isInsideHotspot ? '#fef2f2' : '#f8fafc',
                          border: isInsideHotspot ? '2px solid #ef4444' : '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          boxShadow: isInsideHotspot ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                              {getAnimalEmoji(r.animalType)} {r.animalType} ({r.reportId})
                            </span>
                            <span className={`badge ${isInsideHotspot ? 'badge-danger' : dist <= 800 ? 'badge-warning' : 'badge-gray'}`}>
                              {isInsideHotspot ? '🚨 INSIDE 350m ZONE' : `${dist}m Away`}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            {r.imageUrl && (
                              <img
                                src={r.imageUrl}
                                alt="Subject"
                                style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '1px solid #cbd5e1' }}
                              />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600, margin: '0 0 3px 0', lineHeight: 1.3 }}>
                                {r.description}
                              </p>
                              <div style={{ fontSize: '0.75rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={13} color="#0284c7" />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {r.address}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                GPS: <strong>{r.latitude != null ? Number(r.latitude).toFixed(4) : 'N/A'}, {r.longitude != null ? Number(r.longitude).toFixed(4) : 'N/A'}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                          <button
                            type="button"
                            onClick={() => driveToIncident(r)}
                            className="btn btn-sm btn-primary"
                            style={{
                              flex: 1,
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                              borderColor: '#dc2626',
                              fontWeight: 800,
                              fontSize: '0.775rem',
                              padding: '0.45rem',
                            }}
                          >
                            🚗 Drive to Hotspot & Trigger Siren Sound
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. ALARM SOUND & SIREN QUICK CONTROLLER */}
            <div
              className="card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Volume2 size={20} color="#0284c7" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Alarm Sound Tone & Volume Configuration
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={continuousLoopEnabled}
                      onChange={(e) => setContinuousLoopEnabled(e.target.checked)}
                      style={{ accentColor: '#0284c7' }}
                    />
                    Auto-Loop Alarm Inside Danger Zone
                  </label>
                </div>
              </div>

              {/* Volume Slider & Sound Profiles Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
                {/* Volume Bar */}
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569' }}>
                      Master Siren Alarm Volume
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7' }}>
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Volume1 size={16} color="#64748b" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', accentColor: '#0284c7' }}
                    />
                    <Volume2 size={16} color="#0284c7" />
                  </div>
                </div>

                {/* Warning Proximity Threshold Radius Selector */}
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569' }}>
                      Proximity Alarm Trigger Radius
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7' }}>
                      {warningThresholdRadius} meters
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {[200, 350, 500, 750].map((rad) => (
                      <button
                        key={rad}
                        type="button"
                        onClick={() => setWarningThresholdRadius(rad)}
                        style={{
                          flex: 1,
                          padding: '0.35rem',
                          borderRadius: '8px',
                          border: warningThresholdRadius === rad ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: warningThresholdRadius === rad ? '#e0f2fe' : '#ffffff',
                          color: warningThresholdRadius === rad ? '#0369a1' : '#475569',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {rad}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5 Selectable Siren Audio Profiles */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Selectable Siren Alarm Tones (Click to Select & Preview):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                  {SIREN_PROFILES.map((prof) => {
                    const isSelected = selectedProfile === prof.id;
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => handleSelectSoundProfile(prof.id)}
                        style={{
                          textAlign: 'left',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                          background: isSelected ? '#f0f9ff' : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: isSelected ? '#0369a1' : '#1e293b' }}>
                            {prof.name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '999px',
                              background: isSelected ? '#0284c7' : '#e2e8f0',
                              color: isSelected ? '#ffffff' : '#64748b',
                            }}
                          >
                            {prof.tag}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.25 }}>
                          {prof.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. INTERACTIVE GPS DRIVING SIMULATOR CONSOLE */}
            <div
              className="card"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: '1px solid #334155',
                padding: '1.25rem',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sliders size={20} color="#38bdf8" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                    Interactive GPS Drive Simulator (Test Proximity Warnings)
                  </h3>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Simulate approaching a hotspot to trigger the 350m siren radar without physical driving
                </span>
              </div>

              {/* Scenario Preset Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.6rem', marginBottom: '1.25rem' }}>
                {SIMULATION_SCENARIOS.map((sc) => {
                  const isSelected = selectedScenario.id === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleScenarioChange(sc)}
                      style={{
                        textAlign: 'left',
                        background: isSelected ? 'rgba(2, 132, 199, 0.3)' : 'rgba(255,255,255,0.05)',
                        color: '#ffffff',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#38bdf8' : '#f8fafc', marginBottom: '2px' }}>
                        {sc.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {sc.zone} • Speed: {sc.speed} km/h
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Driving Controls & Interactive Progress Scrubber */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsSimulating(!isSimulating)}
                  style={{
                    background: isSimulating ? '#ef4444' : '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.65rem 1.4rem',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {isSimulating ? (
                    <>
                      <Pause size={16} /> Pause Drive
                    </>
                  ) : (
                    <>
                      <Play size={16} /> Start Drive
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSimulating(false);
                    handleSliderProgress(0);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                  title="Reset to Starting Point"
                >
                  <RotateCcw size={15} /> Reset
                </button>

                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                    <span>📍 Safe Starting Corridor (0%)</span>
                    <span>Progress: <strong>{simProgress}%</strong></span>
                    <span style={{ color: '#f87171' }}>🚨 Danger Hotspot Zone (100%)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={simProgress}
                    onChange={(e) => handleSliderProgress(parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
                  />
                </div>
              </div>
            </div>

            {/* 4. RADAR MAP & NEARBY HOTSPOTS SIDE-BY-SIDE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {/* Left: GIS Radar Map */}
              <div className="card" style={{ padding: '1rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f172a' }}>
                    <Navigation size={18} color="#0284c7" /> Live HUD Radar & Hotspot Map
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Scan Radius: <strong>{warningThresholdRadius}m</strong>
                  </span>
                </div>
                <GisMap
                  center={[driverPos.latitude, driverPos.longitude]}
                  zoom={14}
                  driverLocation={driverPos}
                  hotspots={hotspots}
                  warningRadius={warningThresholdRadius}
                  height="420px"
                />
              </div>

              {/* Right: Telemetry & Nearby Hotspots Quick List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Telemetry Gauge Card */}
                <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Gauge size={18} color="#0d9488" /> Vehicle Real-Time Telemetry
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Speed</span>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                        {driverPos.speed} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>km/h</span>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Nearby Hotspots</span>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7' }}>
                        {nearbyHotspots.length || hotspots.length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>zones</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nearby Hotspots Summary Panel */}
                <div className="card" style={{ flex: 1, padding: '1.25rem', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={18} color="#ef4444" /> Closest Hotspots Nearby
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSection('hotspots')}
                      style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      View All →
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '280px' }}>
                    {filteredHotspots.slice(0, 4).map((h, idx) => {
                      const dist = h.distanceMeters !== undefined ? h.distanceMeters : 450;
                      const isDangerZone = dist <= warningThresholdRadius;
                      return (
                        <div
                          key={h._id || idx}
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            background: isDangerZone ? '#fef2f2' : '#f8fafc',
                            border: isDangerZone ? '1px solid #fecaca' : '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.825rem', fontWeight: 800, color: isDangerZone ? '#b91c1c' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {h.name || `Hotspot #${idx + 1}`}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {h.animalDistribution?.dogs || 3} Dogs • {h.animalDistribution?.cattle || 1} Cattle
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: isDangerZone ? '#ef4444' : '#0284c7' }}>
                              {formatDistance(dist)}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleTeleportToHotspot(h)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#0284c7',
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: 0,
                                textDecoration: 'underline',
                              }}
                            >
                              Drive Here
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: FULLSCREEN LIVE SAFETY MAP ================= */}
        {activeSection === 'safety-map' && (
          <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  Live GIS Animal Hazard Map
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                  Displaying 350m safety perimeter radius around vehicle GPS position.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleTestCurrentSound}
                  className="btn btn-sm btn-secondary"
                >
                  <Volume2 size={16} /> Test Alarm
                </button>
              </div>
            </div>
            <GisMap
              center={[driverPos.latitude, driverPos.longitude]}
              zoom={15}
              driverLocation={driverPos}
              hotspots={hotspots}
              warningRadius={warningThresholdRadius}
              height="620px"
            />
          </div>
        )}

        {/* ================= SECTION 3: NEARBY HOTSPOTS DIRECTORY ================= */}
        {activeSection === 'hotspots' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              className="card"
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  Nearby Animal Accident Hotspots
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                  Real-time spatial clusters sorted by closest proximity to vehicle.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search road or cluster..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setHotspotFilter(lvl)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      border: hotspotFilter === lvl ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: hotspotFilter === lvl ? '#0284c7' : '#ffffff',
                      color: hotspotFilter === lvl ? '#ffffff' : '#334155',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {lvl} RISK
                  </button>
                ))}
              </div>
            </div>

            {/* Hotspots Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {filteredHotspots.map((h, idx) => {
                const dist = h.distanceMeters !== undefined ? h.distanceMeters : 350 + idx * 200;
                const isInsideRadius = dist <= warningThresholdRadius;
                return (
                  <div
                    key={h._id || idx}
                    className="card"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '16px',
                      border: isInsideRadius ? '2px solid #ef4444' : '1px solid #e2e8f0',
                      background: isInsideRadius ? '#fef2f2' : '#ffffff',
                      boxShadow: isInsideRadius ? '0 0 18px rgba(239, 68, 68, 0.15)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.85rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span className={`badge ${getRiskColorClass(h.riskLevel)}`}>
                          {h.riskLevel} RISK
                        </span>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: isInsideRadius ? '#ef4444' : '#0284c7' }}>
                          {formatDistance(dist)}
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                        {h.name || `Hotspot Cluster #${idx + 1}`}
                      </h3>

                      <p style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '0.75rem' }}>
                        Cluster ID: <code>{h.hotspotId || `HS-${idx + 101}`}</code> • Radius: {h.radius || 350}m
                      </p>

                      {/* Animal Incident Count & Advisory */}
                      <div style={{ background: isInsideRadius ? '#fee2e2' : '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '10px', fontSize: '0.75rem', color: '#334155' }}>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                          🐾 Reported Incidents: {h.reportCount || 5} accidents
                        </div>
                        <div style={{ color: '#64748b' }}>
                          Advisory: <strong>Slow to 30 km/h • Watch road shoulders</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleTeleportToHotspot(h)}
                        className="btn btn-sm btn-primary"
                        style={{
                          flex: 1,
                          background: isInsideRadius ? '#ef4444' : '#0284c7',
                          fontWeight: 700,
                          fontSize: '0.775rem',
                        }}
                      >
                        🚗 Simulate Approach
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= SECTION 4: ALERTS & SIREN RADAR ================= */}
        {activeSection === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                <ShieldAlert size={24} color="#ef4444" />
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Alarm Sound Tone & ADAS Collision Settings
                  </h2>
                  <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    Configure the Web Audio acoustic synthesizer and collision alarm triggers.
                  </p>
                </div>
              </div>

              {/* Master Siren Test Deck */}
              <div
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                    Live Acoustic Testing Deck
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '3px 0' }}>
                    Active Tone: {SIREN_PROFILES.find((p) => p.id === selectedProfile)?.name}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Output Volume: {Math.round(volume * 100)}% • Mode: {soundEnabled ? 'Enabled' : 'Muted'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={handleTestCurrentSound}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.75rem 1.4rem',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)',
                    }}
                  >
                    <Volume2 size={18} /> Play Siren Tone
                  </button>
                </div>
              </div>

              {/* All 5 Sound Profiles with Direct Trigger */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                Selectable Warning Sound Synthesizers:
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {SIREN_PROFILES.map((prof) => {
                  const isSelected = selectedProfile === prof.id;
                  return (
                    <div
                      key={prof.id}
                      style={{
                        padding: '1.1rem',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: isSelected ? '#f0f9ff' : '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <h4 style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0f172a' }}>
                            {prof.name}
                          </h4>
                          <span className="badge badge-teal">{prof.tag}</span>
                        </div>
                        <p style={{ fontSize: '0.775rem', color: '#64748b' }}>
                          {prof.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.45rem' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectSoundProfile(prof.id)}
                          className="btn btn-sm btn-primary"
                          style={{
                            flex: 1,
                            background: isSelected ? '#0284c7' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#0f172a',
                            fontWeight: 700,
                          }}
                        >
                          {isSelected ? '✓ Active Default Tone' : 'Select Tone'}
                        </button>
                        <button
                          type="button"
                          onClick={() => soundService.playWarningSiren(prof.id)}
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '0.35rem 0.65rem' }}
                          title="Preview tone sound"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 5: ALERT HISTORY ================= */}
        {activeSection === 'history' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Proximity Alert Logs & History
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Historical log of 350m proximity triggers and driver warning siren events.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {alertHistory.map((al, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#fee2e2',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                        {al.hotspotName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Triggered at: <strong>{al.distanceMeters}m</strong> distance • Timestamp: {al.triggeredAt}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${getRiskColorClass(al.riskLevel)}`}>
                    {al.riskLevel} RISK
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SECTION 6: NOTIFICATIONS ================= */}
        {activeSection === 'notifications' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Driver Safety Broadcasts
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Municipal advisories and high-risk animal movement alerts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${n.type === 'warning' ? '#f59e0b' : '#0284c7'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0f172a' }}>
                      {n.title}
                    </h4>
                    <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{n.time}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#475569' }}>{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SECTION 7: DRIVER PROFILE ================= */}
        {activeSection === 'profile' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', maxWidth: '680px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Driver Vehicle Profile & Radar Calibration
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Hardware sensor integration and audio output device.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Vehicle Identification</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  Commercial Transport / Private Vehicle
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  GPS Telemetry Frequency: <strong>1 Hz (High-Accuracy Real-Time)</strong>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Acoustic Alert Synthesizer</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                  Web Audio API Hardware Accelerated
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Current Tone: <strong>{SIREN_PROFILES.find((p) => p.id === selectedProfile)?.name}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleDashboardLayout>
  );
}
