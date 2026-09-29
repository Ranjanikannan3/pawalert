import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Clock,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Phone,
  UserPlus,
  RefreshCw,
  Send,
  Eye,
  Filter,
  Bell,
  User,
  Activity,
  ShieldCheck,
  Truck,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Shield,
  CheckCircle,
  Zap,
  PieChart as PieChartIcon,
  HeartPulse,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';
import GisMap from '../components/GisMap';
import RescueTimeline from '../components/RescueTimeline';
import RescueTimelineModal from '../components/RescueTimelineModal';
import RoleDashboardLayout from '../components/RoleDashboardLayout';
import { getAnimalEmoji, getStatusBadgeClass } from '../utils/geoUtils';
import confetti from 'canvas-confetti';
import { subscribeToLiveEvents } from '../services/socket';
import { soundService } from '../services/soundService';

const NGO_WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Emergency Ingestion',
    desc: 'Citizen accident report with AI analysis arrives in real-time queue',
    icon: AlertCircle,
  },
  {
    step: 2,
    title: 'Triage & Accept',
    desc: 'Review injury severity, contributing causes, and accept rescue case',
    icon: Activity,
  },
  {
    step: 3,
    title: 'Ambulance Dispatch',
    desc: 'Assigned veterinary squad departs; citizen notified "On the Way"',
    icon: Truck,
  },
  {
    step: 4,
    title: 'Field First Aid',
    desc: 'Volunteer reaches scene, administers emergency stabilization care',
    icon: HeartHandshake,
  },
  {
    step: 5,
    title: 'Rescued & Safe',
    desc: 'Animal transported to veterinary care; case logged as RESCUED',
    icon: CheckCircle2,
  },
];

export default function NgoDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeRescueFilter, setActiveRescueFilter] = useState('ALL');
  const [selectedRescue, setSelectedRescue] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [liveToast, setLiveToast] = useState(null);
  const [expandedTimelineId, setExpandedTimelineId] = useState(null);

  // Status update state
  const [newStatus, setNewStatus] = useState('ON THE WAY');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [assignedVolunteer, setAssignedVolunteer] = useState('Squad 2 (Dr. Ravi - Highway Express)');
  const [volunteerPhone, setVolunteerPhone] = useState('+91 94433 11223');

  useEffect(() => {
    loadRescueRequests();
    loadNotifications();

    // ⚡ Zero-latency real-time Socket.IO live synchronization
    const unsubscribe = subscribeToLiveEvents({
      onNewReport: (data) => {
        console.log('⚡ [NGO Live Sync] Real-time incident report received:', data);
        try {
          soundService.playAlert();
        } catch (e) {}

        const reportObj = data.report || {};
        const rescueObj = data.rescueRequest || {
          _id: `live_${Date.now()}`,
          reportId: reportObj,
          status: 'PENDING',
          priority: reportObj.severity === 'Critical' ? 'Critical' : 'High',
          ngoName: 'Central Rescue Operations',
          createdAt: new Date().toISOString(),
          statusHistory: [
            {
              status: 'PENDING',
              updatedBy: reportObj.citizenName || 'Citizen Volunteer',
              notes: 'Accident reported via citizen mobile/web portal',
              timestamp: new Date(),
            },
          ],
        };

        // Guarantee reportId has the full populated accident report object
        if (!rescueObj.reportId || typeof rescueObj.reportId === 'string') {
          rescueObj.reportId = reportObj;
        }
        rescueObj.isLiveNew = true;

        // 🚀 INSTANT OPTIMISTIC PREPEND TO STATE (Immediate UI & Analytics reaction)
        setRequests((prev) => {
          const exists = prev.some(
            (r) =>
              r._id === rescueObj._id ||
              (r.reportId?._id && reportObj._id && r.reportId._id === reportObj._id) ||
              (r.reportId?.reportId && reportObj.reportId && r.reportId.reportId === reportObj.reportId)
          );
          if (exists) return prev;
          return [rescueObj, ...prev];
        });

        // Trigger visual announcement banner
        setLiveToast({
          title: `🚨 New ${reportObj.animalType || 'Animal'} Accident Ingested!`,
          message: `${reportObj.reportId || 'Case'} reported at ${reportObj.address || 'GPS Scene'}. Added to dispatch queue with live analytics updated.`,
          report: reportObj,
          rescueId: rescueObj._id,
          time: new Date().toLocaleTimeString(),
        });

        setTimeout(() => setLiveToast(null), 12000);

        // Smooth background sync with database
        loadRescueRequests(false);
        loadNotifications();
      },
      onRescueUpdate: () => {
        loadRescueRequests(false);
        loadNotifications();
      },
    });

    // 3-second real-time auto-sync polling guarantee (works in all browsers & network states)
    const pollTimer = setInterval(() => {
      loadRescueRequests(false);
      loadNotifications();
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, []);

  const loadRescueRequests = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Always load all records so 6 KPI cards, species Recharts, and 5-stage funnel are 100% accurate
      const res = await api.getRescueRequests({});
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (e) {
      console.error('Failed to load rescue requests:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications('ngo');
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (e) {}
  };

  // Automatically mark all notifications as read when viewing the notifications tab
  useEffect(() => {
    if (activeSection === 'notifications') {
      const hasUnread = notifications.some((n) => !n.read);
      if (hasUnread) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        api.markAllNotificationsRead('ngo').catch(() => {});
      }
    }
  }, [activeSection, notifications]);

  const handleQuickAccept = async (rescueId) => {
    try {
      const res = await api.updateRescueStatus(rescueId, {
        status: 'ACCEPTED',
        notes: 'Rescue request accepted by NGO squad coordinator.',
      });
      if (res.success) {
        confetti({ particleCount: 70, spread: 50, origin: { y: 0.6 } });
        loadRescueRequests(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to accept rescue.');
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedRescue) return;

    try {
      const res = await api.updateRescueStatus(selectedRescue._id, {
        status: newStatus,
        notes: medicalNotes,
      });

      if (res.success) {
        if (newStatus === 'RESCUED' || newStatus === 'COMPLETED') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        setShowStatusModal(false);
        setMedicalNotes('');
        loadRescueRequests(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to update rescue status.');
    }
  };

  const handleAssignVolunteer = async (e) => {
    e.preventDefault();
    if (!selectedRescue) return;

    try {
      const res = await api.assignVolunteer(selectedRescue._id, {
        assignedVolunteer,
        volunteerPhone,
      });

      if (res.success) {
        setShowAssignModal(false);
        loadRescueRequests(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to assign volunteer.');
    }
  };

  // Convert rescue requests to report coordinates for GIS map
  const mappedReports = requests
    .filter((r) => r.reportId && r.reportId.latitude)
    .map((r) => ({
      _id: r.reportId._id,
      latitude: r.reportId.latitude,
      longitude: r.reportId.longitude,
      animalType: r.reportId.animalType,
      reportId: r.reportId.reportId,
      description: r.reportId.description,
      status: r.status,
      imageUrl: r.reportId.imageUrl,
    }));

  const pendingList = requests.filter((r) => ['PENDING', 'Requested'].includes(r.status));
  const activeList = requests.filter((r) =>
    ['ASSIGNED', 'ACCEPTED', 'ON THE WAY', 'ANIMAL REACHED', 'Assigned', 'Accepted', 'On the Way', 'Animal Reached'].includes(r.status)
  );
  const completedList = requests.filter((r) => ['RESCUED', 'COMPLETED', 'RESOLVED', 'Rescued', 'Completed'].includes(r.status));

  // Dynamic live analytics computed directly from requests state (instantly reactive)
  const totalCases = requests.length;
  const resolutionRate = totalCases > 0 ? Math.round((completedList.length / totalCases) * 100) : 0;
  const criticalCount = requests.filter(
    (r) => r.priority === 'Critical' || r.reportId?.severity === 'Critical'
  ).length;

  // Species distribution computed live from requests
  const speciesCounts = requests.reduce((acc, r) => {
    const animal = r.reportId?.animalType || 'Other';
    acc[animal] = (acc[animal] || 0) + 1;
    return acc;
  }, {});

  const speciesChartData = [
    { name: 'Dog 🐕', species: 'Dog', count: speciesCounts['Dog'] || 0, fill: '#f43f5e' },
    { name: 'Cat 🐈', species: 'Cat', count: speciesCounts['Cat'] || 0, fill: '#f59e0b' },
    { name: 'Cattle 🐄', species: 'Cattle', count: speciesCounts['Cattle'] || 0, fill: '#0284c7' },
    { name: 'Other 🐾', species: 'Other', count: speciesCounts['Other'] || 0, fill: '#10b981' },
  ];

  // Pipeline stages distribution
  const pipelineData = [
    { stage: 'Pending Triage', count: pendingList.length, fill: '#e11d48' },
    {
      stage: 'Squad Assigned',
      count: requests.filter((r) => ['ASSIGNED', 'Assigned'].includes(r.status)).length,
      fill: '#f59e0b',
    },
    {
      stage: 'On The Way',
      count: requests.filter((r) => ['ON THE WAY', 'On the Way', 'ACCEPTED', 'Accepted'].includes(r.status)).length,
      fill: '#3b82f6',
    },
    {
      stage: 'Animal Reached',
      count: requests.filter((r) => ['ANIMAL REACHED', 'Animal Reached'].includes(r.status)).length,
      fill: '#8b5cf6',
    },
    { stage: 'Rescued & Safe', count: completedList.length, fill: '#10b981' },
  ];

  // Severity distribution
  const severityCounts = requests.reduce((acc, r) => {
    const sev = r.reportId?.severity || (r.priority === 'Critical' ? 'Critical' : 'Moderate');
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {});

  const severityPieData = [
    { name: 'Critical', value: severityCounts['Critical'] || 0, color: '#e11d48' },
    { name: 'High', value: severityCounts['High'] || 0, color: '#f59e0b' },
    { name: 'Moderate', value: severityCounts['Moderate'] || 0, color: '#0284c7' },
    { name: 'Low', value: severityCounts['Low'] || 0, color: '#10b981' },
  ].filter((item) => item.value > 0);

  // Contributing road causes
  const causeCounts = requests.reduce((acc, r) => {
    const causes = r.reportId?.possibleCauses || [];
    causes.forEach((c) => {
      acc[c] = (acc[c] || 0) + 1;
    });
    return acc;
  }, {});

  const causeChartData = Object.entries(causeCounts)
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const unreadNgoNotifications = notifications.filter((n) => !n.read).length;

  const ngoNav = [
    { key: 'overview', label: 'Dashboard', icon: HeartHandshake },
    { key: 'analytics', label: 'Rescue Analytics', icon: Activity, badge: `${totalCases}`, badgeColor: '#7c3aed' },
    { key: 'requests', label: 'Rescue Requests', icon: AlertCircle, badge: pendingList.length || null, badgeColor: '#e11d48' },
    { key: 'active', label: 'Active Rescues', icon: Clock, badge: activeList.length || null, badgeColor: '#f59e0b' },
    { key: 'completed', label: 'Completed Rescues', icon: CheckCircle2 },
    { key: 'map', label: 'Rescue Map', icon: MapPin },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: activeSection === 'notifications' ? null : (unreadNgoNotifications > 0 ? unreadNgoNotifications : null),
      badgeColor: '#ef4444',
    },
    { key: 'profile', label: 'NGO Profile', icon: User },
  ];

  return (
    <RoleDashboardLayout
      role="ngo"
      navItems={ngoNav}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Real-time Socket.IO Ingestion Toast Alert */}
        {liveToast && (
          <div
            className="animate-fade-in"
            style={{
              marginBottom: '1.25rem',
              padding: '1rem 1.25rem',
              background: 'linear-gradient(135deg, #ffe4e6, #fef2f2)',
              border: '2px solid #f43f5e',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(244, 63, 94, 0.25)',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#e11d48',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}
              >
                🚨
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#9f1239' }}>
                  {liveToast.title}
                </div>
                <div style={{ fontSize: '0.825rem', color: '#881337', marginTop: '2px' }}>
                  {liveToast.message} • <span style={{ fontWeight: 600 }}>{liveToast.time}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('requests')}
              className="btn btn-sm btn-primary"
              style={{ background: '#e11d48', borderColor: '#e11d48', whiteSpace: 'nowrap' }}
            >
              View in Triage Queue →
            </button>
          </div>
        )}
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e11d48', fontWeight: 700, fontSize: '0.825rem', textTransform: 'uppercase' }}>
              <HeartHandshake size={18} /> NGO & Veterinary Rescue Dispatch
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {activeSection === 'overview' && 'Emergency Animal Rescue Operations'}
              {activeSection === 'requests' && 'New Accident Reports & Triage Queue'}
              {activeSection === 'active' && 'Active Field Rescues in Progress'}
              {activeSection === 'completed' && 'Completed Rescues & Treatment Archive'}
              {activeSection === 'map' && 'Live GIS Animal Rescue Map'}
              {activeSection === 'notifications' && 'Rescue Broadcasts & Alerts'}
              {activeSection === 'profile' && 'NGO Organization & Veterinary Credentials'}
            </h1>
          </div>

          <button onClick={() => loadRescueRequests(true)} className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Queue
          </button>
        </div>

        {/* ================= NGO WORKFLOW PIPELINE ================= */}
        <div
          className="card"
          style={{
            marginBottom: '1.75rem',
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            border: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#f43f5e" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                NGO 5-Stage Rescue & Veterinary Pipeline
              </h3>
            </div>
            <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
              Instant synchronization with reporting citizen and municipal authority
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {NGO_WORKFLOW_STEPS.map((ws) => {
              const Icon = ws.icon;
              return (
                <div
                  key={ws.step}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#e11d48',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {ws.step}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fb7185' }}>
                      {ws.title}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#cbd5e1', lineHeight: 1.3 }}>
                    {ws.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= SECTION 1: OVERVIEW DASHBOARD ================= */}
        {activeSection === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Quick Metrics (6 Real-Time Live KPI Cards) */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="stat-card" style={{ borderLeft: '4px solid #e11d48' }}>
                <div className="stat-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e11d48', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {pendingList.length}
                    {pendingList.length > 0 && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e11d48', display: 'inline-block' }} />
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    New Accident Reports
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <Clock size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706' }}>
                    {activeList.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    Active Field Rescues
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>
                    {completedList.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    Animals Safely Rescued
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                <div className="stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                  <BarChart3 size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed' }}>
                    {totalCases}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    Total Ingested Cases
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #f43f5e' }}>
                <div className="stat-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e11d48' }}>
                    {criticalCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    Critical Urgency Cases
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #0891b2' }}>
                <div className="stat-icon" style={{ background: '#cffafe', color: '#0891b2' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0891b2' }}>
                    {resolutionRate}%
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    Rescue Success Rate
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE REAL-TIME RESCUE ANALYTICS & SPECIES TELEMETRY */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
              {/* Species Breakdown Bar Chart */}
              <div
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: '#ffe4e6',
                        color: '#e11d48',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BarChart3 size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        🐾 Species Ingestion Breakdown
                      </h4>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        Live incident classification from citizen photo AI scans
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      color: '#059669',
                      background: '#d1fae5',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                    Live Reactive
                  </span>
                </div>

                <div style={{ height: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={speciesChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        }}
                        formatter={(val) => [`${val} Incident Reports`, 'Cases Ingested']}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {speciesChartData.map((entry, index) => (
                          <Cell key={`cell-species-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  {speciesChartData.map((s) => {
                    const pct = totalCases > 0 ? Math.round((s.count / totalCases) * 100) : 0;
                    return (
                      <div key={s.species} style={{ textAlign: 'center', padding: '0.35rem', borderRadius: '8px', background: '#f8fafc' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: s.fill, marginTop: '1px' }}>{s.count}</div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{pct}% share</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5-Stage Rescue Funnel Chart */}
              <div
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: '#ede9fe',
                        color: '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Activity size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        ⚡ 5-Stage Rescue Operations Funnel
                      </h4>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        Live progress from citizen filing to successful release
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setActiveSection('analytics')} className="btn btn-sm btn-secondary" style={{ fontSize: '0.725rem', padding: '0.2rem 0.6rem' }}>
                    Full Analytics →
                  </button>
                </div>

                <div style={{ height: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="stage" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }} width={95} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        }}
                        formatter={(val) => [`${val} Animals`, 'Cases']}
                      />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                        {pipelineData.map((entry, index) => (
                          <Cell key={`cell-pipeline-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                    Critical triage cases: <strong style={{ color: '#e11d48' }}>{criticalCount}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                    Resolution rate: <strong style={{ color: '#059669' }}>{resolutionRate}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* FRONT PROMINENT CARD: Citizen Filed Animal Accidents & Emergency Rescue Queue */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', border: '2px solid #fecdd3', background: '#ffffff', boxShadow: '0 4px 20px rgba(225, 29, 72, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🚨 Citizen-Filed Accident Reports & Emergency Queue
                    </h3>
                    <p style={{ fontSize: '0.775rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Accidents filed by citizens via PawAlert AI mobile/web portal with live GPS coordinates and photo proof.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#059669', background: '#d1fae5', padding: '0.3rem 0.65rem', borderRadius: '999px', fontWeight: 700 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                    Live Sync Active
                  </div>
                  <span className="badge badge-danger">{requests.filter((r) => r.status === 'PENDING').length} Pending Acceptance</span>
                  <button onClick={() => setActiveSection('requests')} className="btn btn-sm btn-secondary" style={{ color: '#e11d48', fontWeight: 700 }}>
                    View All ({requests.length}) →
                  </button>
                </div>
              </div>

              {requests.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🐾</div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    No animal accident reports filed yet.
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                    When citizens submit new animal accident reports, they will immediately reflect here with live GPS coordinates, photo, and cause details.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
                  {requests.slice(0, 6).map((r) => {
                    const isPending = r.status === 'PENDING';
                    const animal = r.reportId?.animalType || 'Animal';
                    const reportCode = r.reportId?.reportId || 'PA-REPORT';
                    const severity = r.reportId?.severity || 'Moderate';
                    return (
                      <div
                        key={r._id}
                        style={{
                          padding: '1.15rem',
                          borderRadius: '14px',
                          background: isPending ? '#fff1f2' : '#f8fafc',
                          border: r.isLiveNew ? '3px solid #e11d48' : isPending ? '2px solid #f43f5e' : '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          boxShadow: r.isLiveNew
                            ? '0 0 0 3px rgba(225, 29, 72, 0.35), 0 8px 24px rgba(244, 63, 94, 0.25)'
                            : isPending
                            ? '0 4px 14px rgba(244, 63, 94, 0.12)'
                            : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Top Meta Bar */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '1.1rem' }}>{getAnimalEmoji(animal)}</span>
                              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                                {animal} • {reportCode}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              {r.isLiveNew && (
                                <span
                                  className="badge badge-danger"
                                  style={{
                                    animation: 'pulse 1.2s infinite',
                                    background: '#e11d48',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    boxShadow: '0 2px 8px rgba(225, 29, 72, 0.4)',
                                  }}
                                >
                                  ⚡ JUST REPORTED (LIVE)
                                </span>
                              )}
                              <span className={`badge ${severity === 'Critical' ? 'badge-danger' : severity === 'Moderate' ? 'badge-warning' : 'badge-teal'}`}>
                                {severity} Urgency
                              </span>
                              <span className={`badge ${getStatusBadgeClass(r.status)}`}>
                                {r.status}
                              </span>
                            </div>
                          </div>

                          {/* Image & Incident Details */}
                          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginTop: '0.4rem' }}>
                            {r.reportId?.imageUrl ? (
                              <img
                                src={r.reportId.imageUrl}
                                alt="Accident Subject"
                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0, border: '1px solid #cbd5e1' }}
                              />
                            ) : (
                              <div style={{ width: '80px', height: '80px', borderRadius: '10px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>
                                🐾
                              </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '0.825rem', color: '#1e293b', fontWeight: 600, margin: '0 0 4px 0', lineHeight: 1.3 }}>
                                {r.reportId?.description || 'Injured animal requiring immediate rescue and veterinary assistance.'}
                              </p>
                              <div style={{ fontSize: '0.75rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <MapPin size={13} color="#0284c7" />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {r.reportId?.address || 'GPS Coordinates on file'}
                                </span>
                              </div>
                              {r.reportId?.latitude && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                  Coords: <strong>{r.reportId.latitude.toFixed(4)}, {r.reportId.longitude.toFixed(4)}</strong>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Suspected causes and observation */}
                          {Array.isArray(r.reportId?.possibleCauses) && r.reportId.possibleCauses.length > 0 && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Contributing:</span>
                              {r.reportId.possibleCauses.map((c, i) => (
                                <span key={i} style={{ background: '#ffe4e6', color: '#e11d48', fontSize: '0.675rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}

                          {r.reportId?.citizenObservation && (
                            <div style={{ fontSize: '0.725rem', color: '#475569', fontStyle: 'italic', marginTop: '4px', background: 'rgba(0,0,0,0.03)', padding: '4px 8px', borderRadius: '6px' }}>
                              "{r.reportId.citizenObservation}"
                            </div>
                          )}
                          {/* Compact Timeline Stepper Bar */}
                          <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
                            <RescueTimeline compact currentStatus={r.status} />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedTimelineId(expandedTimelineId === r._id ? null : r._id)}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Toggle detailed 7-stage operations timeline"
                          >
                            <Clock size={13} /> Timeline {expandedTimelineId === r._id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>

                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => handleQuickAccept(r._id)}
                              className="btn btn-sm btn-primary"
                              style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a', fontWeight: 800, fontSize: '0.8rem', padding: '0.45rem' }}
                            >
                              <Check size={15} /> ⚡ Accept Rescue Request
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRescue(r);
                                setShowStatusModal(true);
                              }}
                              className="btn btn-sm btn-primary"
                              style={{ flex: 1, fontWeight: 800, fontSize: '0.775rem' }}
                            >
                              <Activity size={14} /> Update Status & Care →
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRescue(r);
                              setShowAssignModal(true);
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ fontWeight: 600, fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                          >
                            <UserPlus size={13} /> Assign Squad
                          </button>
                        </div>

                        {/* Expandable Inline Timeline Drawer */}
                        {expandedTimelineId === r._id && (
                          <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                                Live 7-Stage Rescue Trajectory & Dispatch Audit
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRescue(r);
                                  setShowStatusModal(true);
                                }}
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: '0.725rem', padding: '0.25rem 0.65rem', fontWeight: 800 }}
                              >
                                ⚡ Open Update Studio →
                              </button>
                            </div>
                            <RescueTimeline currentStatus={r.status} statusHistory={r.statusHistory} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Split View: Live Rescue Queue & Map */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {/* Emergency Queue */}
              <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={18} color="#e11d48" /> Active Rescues Roster
                  </h3>
                  <button onClick={() => setActiveSection('requests')} style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    View All ({requests.length}) →
                  </button>
                </div>

                {requests.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🐾</div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      No rescue requests yet.
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                      When citizens submit new animal accident reports, they will immediately appear here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '440px', overflowY: 'auto' }}>
                    {requests.slice(0, 4).map((r) => (
                      <div
                        key={r._id}
                        style={{
                          padding: '1rem',
                          borderRadius: '12px',
                          background: r.status === 'PENDING' ? '#fff1f2' : '#f8fafc',
                          border: r.status === 'PENDING' ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.925rem', color: '#0f172a' }}>
                            {getAnimalEmoji(r.reportId?.animalType)} {r.reportId?.reportId || 'ALERT'}
                          </span>
                          <span className={`badge ${getStatusBadgeClass(r.status)}`}>
                            {r.status}
                          </span>
                        </div>

                        {/* Photo Thumbnail + Description */}
                        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                          {r.reportId?.imageUrl && (
                            <img
                              src={r.reportId.imageUrl}
                              alt="Animal"
                              style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                            />
                          )}
                          <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                            <p style={{ marginBottom: '2px' }}>{r.reportId?.description}</p>
                            <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                              📍 {r.reportId?.address}
                            </div>
                          </div>
                        </div>

                        {/* Contributing causes if present */}
                        {Array.isArray(r.reportId?.possibleCauses) && r.reportId.possibleCauses.length > 0 && (
                          <div style={{ fontSize: '0.7rem', color: '#e11d48', fontWeight: 600 }}>
                            Suspected Causes: {r.reportId.possibleCauses.join(', ')}
                          </div>
                        )}

                        {/* Quick Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
                          {r.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleQuickAccept(r._id)}
                              className="btn btn-sm btn-primary"
                              style={{ background: '#16a34a', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                            >
                              <Check size={13} /> Accept Rescue
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRescue(r);
                              setShowAssignModal(true);
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                          >
                            <UserPlus size={13} /> Assign Squad
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRescue(r);
                              setShowStatusModal(true);
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                          >
                            Update Status
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* GIS Map Preview */}
              <div className="card" style={{ padding: '1rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={18} color="#e11d48" /> Active Patient GIS Map
                  </h3>
                  <button onClick={() => setActiveSection('map')} style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    Fullscreen Map →
                  </button>
                </div>
                <GisMap center={[8.7138, 77.7568]} zoom={13} reports={mappedReports} height="380px" />
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: ADVANCED RESCUE ANALYTICS ================= */}
        {activeSection === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              className="card"
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: '#ffffff',
                border: '1px solid #334155',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fb7185', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    <Activity size={16} /> Real-Time Rescue Operations Telemetry
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0 0', color: '#ffffff' }}>
                    Animal Accident Ingestion & Rescue Analytics
                  </h2>
                  <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                    Real-time telemetry updated instantaneously as citizens file accident reports with live GPS coordinates.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid #10b981',
                      color: '#34d399',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    Zero-Latency Live Sync Active
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Metric KPI Cards */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="stat-card" style={{ borderLeft: '4px solid #e11d48' }}>
                <div className="stat-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e11d48' }}>{pendingList.length}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Pending Ingestion Queue</div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <Clock size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706' }}>{activeList.length}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Active Field Rescues</div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>{completedList.length}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Animals Safely Rescued</div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                <div className="stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                  <BarChart3 size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed' }}>{totalCases}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Total Cases Ingested</div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #f43f5e' }}>
                <div className="stat-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e11d48' }}>{criticalCount}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Critical Severity Cases</div>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeft: '4px solid #0891b2' }}>
                <div className="stat-icon" style={{ background: '#cffafe', color: '#0891b2' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0891b2' }}>{resolutionRate}%</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Rescue Resolution Rate</div>
                </div>
              </div>
            </div>

            {/* Visual Analytics Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
              {/* Species Breakdown */}
              <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🐾 Species Emergency Distribution
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e11d48', background: '#ffe4e6', padding: '2px 8px', borderRadius: '999px' }}>
                    {totalCases} Total Reports
                  </span>
                </div>
                <p style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Relative volume of animal accident incidents submitted by citizens and verified by AI
                </p>
                <div style={{ height: '260px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={speciesChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#ffffff', fontSize: '0.8rem' }}
                        formatter={(val) => [`${val} Reports`, 'Cases']}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {speciesChartData.map((entry, index) => (
                          <Cell key={`spec-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  {speciesChartData.map((s) => {
                    const pct = totalCases > 0 ? Math.round((s.count / totalCases) * 100) : 0;
                    return (
                      <div key={s.species} style={{ textAlign: 'center', padding: '0.4rem', borderRadius: '8px', background: '#f8fafc' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.fill, marginTop: '1px' }}>{s.count}</div>
                        <div style={{ fontSize: '0.675rem', color: '#94a3b8' }}>{pct}% share</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Severity Breakdown */}
              <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚠️ Incident Severity Triage Share
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '999px' }}>
                    Triage Urgency
                  </span>
                </div>
                <p style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Classification of injury urgency requiring immediate squad dispatch
                </p>
                <div style={{ height: '260px', width: '100%' }}>
                  {severityPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={85}
                          innerRadius={45}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {severityPieData.map((entry, index) => (
                            <Cell key={`pie-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#ffffff', fontSize: '0.8rem' }}
                          formatter={(val) => [`${val} Cases`, 'Urgency']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                      No severity telemetry recorded yet
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Critical Severity</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#e11d48' }}>{criticalCount}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Active in Field</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#d97706' }}>{activeList.length}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Safe & Treated</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>{completedList.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contributing Road Hazards */}
            {causeChartData.length > 0 && (
              <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                  🚧 Top Contributing Road Hazards (Citizen Reported)
                </h3>
                <p style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '1rem' }}>
                  Hazardous factors frequently observed at accident GPS scenes
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {causeChartData.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>{c.cause}</span>
                      <span style={{ background: '#ffe4e6', color: '#e11d48', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px' }}>
                        {c.count} cases
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 2: RESCUE REQUESTS QUEUE ================= */}
        {activeSection === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                New Accident Reports Queue ({pendingList.length})
              </h2>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Citizen-reported injured animals awaiting acceptance and squad dispatch.
              </p>
            </div>

            {pendingList.length === 0 ? (
              <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', borderRadius: '16px' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🐾</div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  No rescue requests yet.
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
                  The emergency queue is currently clear. New citizen accident reports will appear here instantly.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                {pendingList.map((r) => (
                  <div key={r._id} className="card" style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid #fecdd3', background: '#fff1f2', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#9f1239' }}>
                          {getAnimalEmoji(r.reportId?.animalType)} {r.reportId?.reportId}
                        </span>
                        <span className="badge badge-danger">{r.reportId?.severity || 'High'} Severity</span>
                      </div>

                      {r.reportId?.imageUrl && (
                        <img
                          src={r.reportId.imageUrl}
                          alt="Animal"
                          style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }}
                        />
                      )}

                      <p style={{ fontSize: '0.825rem', color: '#4c0519', marginBottom: '0.5rem' }}>
                        {r.reportId?.description}
                      </p>
                      <div style={{ fontSize: '0.75rem', color: '#881337', marginBottom: '0.25rem' }}>
                        📍 <strong>Location:</strong> {r.reportId?.address}
                      </div>
                      {Array.isArray(r.reportId?.possibleCauses) && r.reportId.possibleCauses.length > 0 && (
                        <div style={{ fontSize: '0.725rem', color: '#9f1239', fontWeight: 700 }}>
                          Contributing Causes: {r.reportId.possibleCauses.join(', ')}
                        </div>
                      )}
                      {r.reportId?.citizenObservation && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                          "{r.reportId.citizenObservation}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleQuickAccept(r._id)}
                        className="btn btn-sm btn-primary"
                        style={{ flex: 1, background: '#16a34a', fontWeight: 700 }}
                      >
                        <Check size={14} /> Accept Rescue
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRescue(r);
                          setShowAssignModal(true);
                        }}
                        className="btn btn-sm btn-primary"
                        style={{ flex: 1, background: '#e11d48', fontWeight: 700 }}
                      >
                        <UserPlus size={14} /> Assign & Dispatch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 3: ACTIVE RESCUES ================= */}
        {activeSection === 'active' && (() => {
          const matchRescueStage = (r, key) => {
            const st = (r.status || '').toUpperCase();
            if (key === 'ACCEPTED') return st === 'ACCEPTED';
            if (key === 'ASSIGNED') return st === 'ASSIGNED';
            if (key === 'ON THE WAY') return st === 'ON THE WAY' || st === 'ON_THE_WAY';
            if (key === 'ANIMAL REACHED') return st === 'ANIMAL REACHED' || st === 'ANIMAL_REACHED';
            return false;
          };

          const activeCounts = {
            ALL: activeList.length,
            ACCEPTED: activeList.filter((r) => matchRescueStage(r, 'ACCEPTED')).length,
            ASSIGNED: activeList.filter((r) => matchRescueStage(r, 'ASSIGNED')).length,
            'ON THE WAY': activeList.filter((r) => matchRescueStage(r, 'ON THE WAY')).length,
            'ANIMAL REACHED': activeList.filter((r) => matchRescueStage(r, 'ANIMAL REACHED')).length,
          };

          const RESCUE_ACTIVE_STAGES = [
            {
              key: 'ACCEPTED',
              label: '1. Squad Accepted - Ready for Dispatch',
              desc: 'Case accepted by NGO squad; volunteer/driver assignment pending.',
              color: '#2563eb',
              bg: '#eff6ff',
              border: '#bfdbfe',
            },
            {
              key: 'ASSIGNED',
              label: '2. Field Squad & Driver Assigned',
              desc: 'Driver and veterinary specialist assigned to ambulance vehicle.',
              color: '#d97706',
              bg: '#fffbeb',
              border: '#fde68a',
            },
            {
              key: 'ON THE WAY',
              label: '3. Veterinary Squad On The Way',
              desc: 'Ambulance squad en-route to live incident GPS coordinates.',
              color: '#7c3aed',
              bg: '#ede9fe',
              border: '#ddd6fe',
            },
            {
              key: 'ANIMAL REACHED',
              label: '4. Animal Reached - Stabilization On Scene',
              desc: 'First responder administering emergency triage and first-aid treatment.',
              color: '#e11d48',
              bg: '#fef2f2',
              border: '#fecdd3',
            },
          ];

          const filteredActive = activeList.filter((r) => {
            if (activeRescueFilter === 'ALL') return true;
            return matchRescueStage(r, activeRescueFilter);
          });

          const renderActiveRescueCard = (r) => (
            <div key={r._id} className="card" style={{ padding: '1.25rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                    {getAnimalEmoji(r.reportId?.animalType)} {r.reportId?.reportId}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span>
                </div>
                <p style={{ fontSize: '0.825rem', color: '#475569', marginBottom: '0.5rem' }}>
                  {r.reportId?.description}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 700 }}>
                  🚑 Squad: {r.assignedVolunteer || 'Squad 2 (Dr. Ravi)'}
                </div>

                {/* Compact Timeline Stepper Bar */}
                <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
                  <RescueTimeline compact currentStatus={r.status} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setExpandedTimelineId(expandedTimelineId === r._id ? null : r._id)}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Clock size={13} /> {expandedTimelineId === r._id ? 'Hide Timeline' : 'Live Timeline'} {expandedTimelineId === r._id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRescue(r);
                    setShowStatusModal(true);
                  }}
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1, fontWeight: 800, fontSize: '0.8rem' }}
                >
                  ⚡ Update Status & Care →
                </button>
              </div>

              {/* Expandable Inline Timeline Drawer */}
              {expandedTimelineId === r._id && (
                <div style={{ marginTop: '0.5rem', padding: '0.85rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                      Full 7-Stage Live Status Trajectory
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRescue(r);
                        setShowStatusModal(true);
                      }}
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                    >
                      Update ➔
                    </button>
                  </div>
                  <RescueTimeline currentStatus={r.status} statusHistory={r.statusHistory} />
                </div>
              )}
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Active Rescues in Progress ({activeList.length})
                  </h2>
                  <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    Field ambulance teams organized by their real-time dispatch and medical care stage.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {['ALL', 'ACCEPTED', 'ASSIGNED', 'ON THE WAY', 'ANIMAL REACHED'].map((st) => {
                    const count = activeCounts[st] ?? 0;
                    const isSel = activeRescueFilter === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setActiveRescueFilter(st)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          border: isSel ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                          background: isSel ? '#f59e0b' : '#ffffff',
                          color: isSel ? '#ffffff' : '#334155',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span>{st}</span>
                        <span style={{ fontSize: '0.675rem', background: isSel ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: isSel ? '#ffffff' : '#475569', padding: '1px 5px', borderRadius: '8px' }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredActive.length === 0 ? (
                <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', borderRadius: '16px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚑</div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    No active field rescues in {activeRescueFilter} stage.
                  </h4>
                </div>
              ) : activeRescueFilter === 'ALL' ? (
                /* Grouped under respective stages when viewing ALL */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {RESCUE_ACTIVE_STAGES.map((stage) => {
                    const stageRescues = filteredActive.filter((r) => matchRescueStage(r, stage.key));
                    if (stageRescues.length === 0) return null;
                    return (
                      <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1.15rem',
                            borderRadius: '12px',
                            background: stage.bg,
                            border: `1.5px solid ${stage.border}`,
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: stage.color }} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{stage.label}</h4>
                                <span style={{ background: stage.color, color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '1px 7px', borderRadius: '10px' }}>
                                  {stageRescues.length} {stageRescues.length === 1 ? 'rescue' : 'rescues'}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>{stage.desc}</p>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                          {stageRescues.map((r) => renderActiveRescueCard(r))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Filtered flat list */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                  {filteredActive.map((r) => renderActiveRescueCard(r))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= SECTION 4: COMPLETED RESCUES ================= */}
        {activeSection === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Completed Rescues Archive ({completedList.length})
              </h2>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Verified recoveries and closed medical logs.
              </p>
            </div>

            {completedList.length === 0 ? (
              <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', borderRadius: '16px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>❤️</div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  No completed rescue archives yet.
                </h4>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {completedList.map((r) => (
                  <div key={r._id} className="card" style={{ padding: '1.25rem', borderRadius: '14px', borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                        {getAnimalEmoji(r.reportId?.animalType)} {r.reportId?.reportId}
                      </span>
                      <span className="badge badge-risk-low">RESCUED ✓</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
                      {r.medicalNotes || 'Successfully treated and transported to veterinary sanctuary.'}
                    </p>

                    {/* Compact Timeline Stepper Bar */}
                    <div style={{ margin: '0.5rem 0', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                      <RescueTimeline compact currentStatus={r.status} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                        Recovered at: {new Date(r.updatedAt || r.completedAt || r.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedTimelineId(expandedTimelineId === r._id ? null : r._id)}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Clock size={12} /> {expandedTimelineId === r._id ? 'Hide Timeline' : 'View Audit Trail'} {expandedTimelineId === r._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {expandedTimelineId === r._id && (
                      <div style={{ marginTop: '0.75rem', padding: '0.85rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <RescueTimeline currentStatus={r.status} statusHistory={r.statusHistory} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 5: RESCUE MAP ================= */}
        {activeSection === 'map' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Emergency Patient Spatial Radar
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
              Live coordinate map showing current triage locations and dispatched ambulances.
            </p>
            <GisMap center={[8.7138, 77.7568]} zoom={13} reports={mappedReports} height="560px" />
          </div>
        )}

        {/* ================= SECTION 6: NOTIFICATIONS ================= */}
        {activeSection === 'notifications' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Rescue Broadcasts & Alerts
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No alerts yet.</div>
              ) : (
                notifications.map((n) => (
                  <div key={n._id || n.id} style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #e11d48' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0f172a' }}>{n.title}</h4>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{new Date(n.createdAt || Date.now()).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#475569' }}>{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= SECTION 7: PROFILE ================= */}
        {activeSection === 'profile' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', maxWidth: '680px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              NGO Organization & Veterinary Fleet Profile
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Organization</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>PawAlert City Animal Rescue Squad</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Ambulance Fleet</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#e11d48' }}>4 Active Squad Ambulances (GPS Synced)</div>
              </div>
            </div>
          </div>
        )}

        {/* Assign Volunteer Modal */}
        {showAssignModal && selectedRescue && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setShowAssignModal(false)}
          >
            <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '1.75rem' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
                Assign Rescue Squad to {selectedRescue.reportId?.reportId}
              </h3>
              <form onSubmit={handleAssignVolunteer} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Select Squad / Volunteer:
                  </label>
                  <select
                    value={assignedVolunteer}
                    onChange={(e) => setAssignedVolunteer(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Squad 1 (Dr. Ananya - North Area)">Squad 1 (Dr. Ananya - North Area)</option>
                    <option value="Squad 2 (Dr. Ravi - Highway Express)">Squad 2 (Dr. Ravi - Highway Express)</option>
                    <option value="Squad 3 (Vet Volunteer Team C)">Squad 3 (Vet Volunteer Team C)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#e11d48' }}>Confirm Dispatch</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Rescue Workflow & Timeline Modal */}
        <RescueTimelineModal
          isOpen={showStatusModal && !!selectedRescue}
          rescue={selectedRescue}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedRescue(null);
          }}
          onSuccess={(updated) => {
            loadRescueRequests(false);
            loadNotifications();
          }}
        />
      </div>
    </RoleDashboardLayout>
  );
}
