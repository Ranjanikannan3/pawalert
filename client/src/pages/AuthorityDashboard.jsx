import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  AlertTriangle,
  HeartHandshake,
  CheckCircle2,
  RefreshCw,
  Plus,
  BarChart3,
  TrendingUp,
  MapPin,
  Clock,
  Layers,
  Wrench,
  Bell,
  User,
  FileText,
  Sliders,
  Sparkles,
  PieChart as PieIcon,
  ShieldCheck,
  Camera,
  Upload,
  ArrowRight,
  Eye,
  Info,
  Check,
  Calendar,
  Building,
  Flag,
} from 'lucide-react';
import GisMap from '../components/GisMap';
import RoleDashboardLayout from '../components/RoleDashboardLayout';
import CameraProofCaptureModal from '../components/CameraProofCaptureModal';
import { api } from '../services/api';
import { getRiskColorClass, getAnimalEmoji, getStatusBadgeClass, getReportStage, REPORT_STAGE_CONFIGS } from '../utils/geoUtils';
import { subscribeToLiveEvents } from '../services/socket';
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

const AUTHORITY_WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Spatial Accident Ingestion',
    desc: 'Aggregates GPS accident data from citizens, police, and field rescue teams',
    icon: MapPin,
  },
  {
    step: 2,
    title: 'DBSCAN Density Clustering',
    desc: 'Applies ε=450m radius and MinPts=2 spatial clustering to discover repeats',
    icon: Sliders,
  },
  {
    step: 3,
    title: 'Root Cause Analytics',
    desc: 'Aggregates citizen-reported environmental hazards (lighting, garbage, speed)',
    icon: BarChart3,
  },
  {
    step: 4,
    title: 'Remediation Deployment',
    desc: 'Deploys warning signs, speed breakers, solar streetlights, or sanitation teams',
    icon: Wrench,
  },
  {
    step: 5,
    title: 'Proof & Citizen Notification',
    desc: 'Uploads mandatory resolution photo proof and notifies citizens of solved hazards',
    icon: ShieldCheck,
  },
];

const PREDEFINED_ACTIONS = [
  'Improve street lighting',
  'Remove garbage & food dump',
  'Install animal warning signs',
  'Install speed breaker / rumble strips',
  'Improve road visibility & clear brush',
  'Remove road obstruction',
  'Install animal deterrent barrier / fencing',
  'Increase traffic monitoring & speed enforcement',
  'Coordinate with animal welfare organization',
  'Conduct on-site engineering field inspection',
  'Other custom remediation',
];

const PREDEFINED_DEPARTMENTS = [
  'Municipal Road Safety & Traffic Engineering',
  'Electrical & Street Lighting Department',
  'City Sanitation & Solid Waste Management',
  'Highways & Public Works Department (PWD)',
  'Animal Husbandry & Veterinary Services',
  'Traffic Police & Enforcement Wing',
];

const PREDEFINED_CAUSES = [
  'Poor street lighting',
  'High vehicle speed',
  'Garbage/food attracting animals',
  'Poor road visibility',
  'Animals frequently crossing this road',
  'Road obstruction',
  'Poor traffic control',
  'Construction area',
  'Vehicles parked near road',
  'Poor weather/visibility',
  'Heavy traffic/noise',
  'Other contributing factor',
];

export default function AuthorityDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState({});
  const [hotspots, setHotspots] = useState([]);
  const [reports, setReports] = useState([]);
  const [actions, setActions] = useState([]);
  const [trends, setTrends] = useState([]);
  const [animalData, setAnimalData] = useState([]);
  const [causeAnalysis, setCauseAnalysis] = useState(null);
  const [riskFilter, setRiskFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [reportFilter, setReportFilter] = useState('ALL');
  const [reportSearch, setReportSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Create Action Modal State
  const [showCreateActionModal, setShowCreateActionModal] = useState(false);
  const [selectedHotspotForAction, setSelectedHotspotForAction] = useState(null);
  const [selectedReportForAction, setSelectedReportForAction] = useState(null);
  const [newAction, setNewAction] = useState({
    problem: '',
    possibleCause: 'Poor street lighting',
    actionType: 'Improve street lighting',
    assignedDepartment: 'Municipal Road Safety & Traffic Engineering',
    assignedOfficer: 'Traffic Safety Engineering Squad',
    priority: 'HIGH',
    targetDate: '',
    notes: '',
  });

  // Complete Action & Mandatory Solved Photo Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [actionToComplete, setActionToComplete] = useState(null);
  const [beforeImageUrl, setBeforeImageUrl] = useState('');
  const [beforeImageFile, setBeforeImageFile] = useState(null);
  const [solvedImageFile, setSolvedImageFile] = useState(null);
  const [solvedImageUrl, setSolvedImageUrl] = useState('');
  const [solvedLatitude, setSolvedLatitude] = useState(null);
  const [solvedLongitude, setSolvedLongitude] = useState(null);
  const [solvedGpsAccuracy, setSolvedGpsAccuracy] = useState(null);
  const [solvedAddress, setSolvedAddress] = useState('');
  const [solvedNotes, setSolvedNotes] = useState('');
  const [completingAction, setCompletingAction] = useState(false);

  // Live Camera Geotag Modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraModalType, setCameraModalType] = useState('after'); // 'before' | 'after'

  // Before/After Inspection Modal
  const [inspectedAction, setInspectedAction] = useState(null);

  // Notifications with persistent read tracking
  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(new Set());

  useEffect(() => {
    loadAllData();

    // Zero-latency real-time Socket.IO live synchronization
    const unsubscribe = subscribeToLiveEvents({
      onNewReport: (data) => {
        console.log('⚡ [Authority Live Sync] Real-time incident report received:', data);
        loadAllData();
      },
      onHotspotUpdate: () => {
        loadAllData();
      },
      onAuthorityAction: () => {
        loadAllData();
      },
      onRescueUpdate: () => {
        loadAllData();
      },
    });

    // Periodic real-time auto-sync guarantee
    const pollTimer = setInterval(() => {
      loadAllData();
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, [riskFilter]);

  const handleMarkNotificationRead = async (notifId) => {
    setReadNotifIds((prev) => new Set(prev).add(notifId));
    setNotifications((prev) =>
      prev.map((n) => ((n._id === notifId || n.id === notifId) ? { ...n, read: true } : n))
    );
    try {
      await api.markNotificationRead(notifId);
    } catch (err) {
      console.warn('Mark notification read notice:', err.message);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const allIds = notifications.map((n) => n._id || n.id);
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead('authority');
    } catch (err) {
      console.warn('Mark all read notice:', err.message);
    }
  };

  // Automatically mark all notifications as read when viewing the notifications tab
  useEffect(() => {
    if (activeSection === 'notifications') {
      const hasUnread = notifications.some((n) => !n.read && !readNotifIds.has(n._id || n.id));
      if (hasUnread) {
        handleMarkAllNotificationsRead();
      }
    }
  }, [activeSection]);

  const loadAllData = async () => {
    try {
      const [statsRes, hotspotsRes, reportsRes, actionsRes, trendsRes, animalRes, causesRes, notifsRes] =
        await Promise.all([
          api.getOverviewStats().catch(() => ({})),
          api.getHotspots({ riskLevel: riskFilter }).catch(() => ({})),
          api.getReports({ limit: 50 }).catch(() => ({})),
          api.getAuthorityActions().catch(() => ({})),
          api.getTrends().catch(() => ({})),
          api.getAnimalBreakdown().catch(() => ({})),
          api.getCauseAnalysis().catch(() => ({})),
          api.getNotifications('authority').catch(() => ({})),
        ]);

      if (statsRes.success) setStats(statsRes.data || {});
      if (hotspotsRes.success) setHotspots(hotspotsRes.hotspots || []);
      if (reportsRes.success) setReports(reportsRes.reports || []);
      if (actionsRes.success) setActions(actionsRes.actions || []);
      if (trendsRes.success) setTrends(trendsRes.trends || []);
      if (animalRes.success) setAnimalData(animalRes.breakdown || []);
      if (causesRes.success) setCauseAnalysis(causesRes.data || causesRes);
      if (notifsRes.success) {
        setNotifications((notifsRes.notifications || []).map((n) => ({
          ...n,
          read: n.read || readNotifIds.has(n._id || n.id),
        })));
      }
    } catch (e) {
      console.error('Failed to load authority dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateHotspots = async () => {
    setRecalculating(true);
    try {
      await api.recalculateHotspots();
      await loadAllData();
      alert('DBSCAN spatial clustering and cause aggregation recalculated successfully!');
    } catch (e) {
      alert('Error during hotspot clustering recalculation.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleOpenCreateActionModal = (hotspot = null, report = null) => {
    if (hotspot) {
      setSelectedHotspotForAction(hotspot._id);
      setNewAction((prev) => ({
        ...prev,
        problem: `High-frequency animal collisions at ${hotspot.name}`,
        possibleCause: hotspot.mostFrequentCause || 'Poor street lighting',
        targetArea: hotspot.name,
      }));
    } else if (report) {
      setSelectedReportForAction(report._id);
      setSelectedHotspotForAction(report.hotspotId?._id || report.hotspotId || null);
      setNewAction((prev) => ({
        ...prev,
        problem: `Accident near ${report.address || 'roadway'} (${report.animalType})`,
        possibleCause: report.possibleCauses?.[0] || 'Poor street lighting',
        notes: report.citizenObservation || '',
        targetArea: report.address,
      }));
    }
    setShowCreateActionModal(true);
  };

  const handleCreateActionSubmit = async (e) => {
    e.preventDefault();
    if (!newAction.problem || !newAction.actionType) {
      alert('Please specify the problem and remediation action.');
      return;
    }

    try {
      const payload = {
        hotspotId: selectedHotspotForAction || undefined,
        reportId: selectedReportForAction || undefined,
        problem: newAction.problem,
        possibleCause: newAction.possibleCause,
        actionType: newAction.actionType,
        assignedDepartment: newAction.assignedDepartment,
        assignedOfficer: newAction.assignedOfficer,
        priority: newAction.priority,
        dueDate: newAction.targetDate || undefined,
        description: newAction.notes || `${newAction.actionType} to mitigate ${newAction.possibleCause}`,
        notes: newAction.notes,
        targetArea: newAction.targetArea || 'Target Sector',
      };

      const res = await api.createAuthorityAction(payload);
      if (res.success) {
        setShowCreateActionModal(false);
        setNewAction({
          problem: '',
          possibleCause: 'Poor street lighting',
          actionType: 'Improve street lighting',
          assignedDepartment: 'Municipal Road Safety & Traffic Engineering',
          assignedOfficer: 'Traffic Safety Engineering Squad',
          priority: 'HIGH',
          targetDate: '',
          notes: '',
        });
        setSelectedHotspotForAction(null);
        setSelectedReportForAction(null);
        loadAllData();
      }
    } catch (err) {
      alert(err.message || 'Failed to create authority action.');
    }
  };

  const handleStartAction = async (actionId) => {
    try {
      await api.updateAuthorityAction(actionId, { status: 'IN_PROGRESS' });
      loadAllData();
    } catch (e) {
      alert(e.message || 'Failed to update action status');
    }
  };

  const handleOpenCompleteModal = (target = null) => {
    let actionObj = target;
    if (!target) {
      if (reports.length > 0) {
        actionObj = reports[0];
      } else {
        actionObj = {
          isNewFromReport: true,
          actionType: 'Remediate Animal Accident Hazard',
          problem: 'Road safety hazard and stray animal protection',
          possibleCause: 'Poor street lighting',
          assignedDepartment: 'Municipal Road Safety & Infrastructure',
          targetArea: 'Municipal road sector',
          status: 'PENDING',
        };
      }
    }

    const isReport = Boolean(actionObj.reportId && !actionObj.actionType);
    if (isReport) {
      const existingAction = actions.find((a) => (a.reportId?._id || a.reportId) === actionObj._id);
      if (existingAction) {
        actionObj = existingAction;
      } else {
        actionObj = {
          isNewFromReport: true,
          reportId: actionObj,
          actionType: `Remediate ${actionObj.animalType || 'Animal'} Accident Hazard`,
          problem: actionObj.description || `Animal accident hazard at ${actionObj.address || 'location'}`,
          possibleCause: (actionObj.possibleCauses && actionObj.possibleCauses[0]) || actionObj.rootCause || 'Poor street lighting',
          assignedDepartment: 'Municipal Road Safety & Infrastructure',
          targetArea: actionObj.address || 'Municipal road sector',
          beforeImageUrl: actionObj.imageUrl || '',
          status: 'PENDING',
        };
      }
    }

    setActionToComplete(actionObj);
    setBeforeImageUrl(actionObj.beforeImageUrl || actionObj.reportId?.imageUrl || '');
    setBeforeImageFile(null);
    setSolvedImageFile(null);
    setSolvedImageUrl(actionObj.solvedImageUrl || '');
    setSolvedLatitude(actionObj.solvedLatitude || actionObj.reportId?.latitude || 8.7138);
    setSolvedLongitude(actionObj.solvedLongitude || actionObj.reportId?.longitude || 77.7568);
    setSolvedGpsAccuracy(actionObj.solvedGpsAccuracy || 10);
    setSolvedAddress(actionObj.solvedAddress || actionObj.targetArea || actionObj.reportId?.address || 'Municipal road sector');
    setSolvedNotes(actionObj.solvedNotes || '');
    setShowCompleteModal(true);
  };

  const handleOpenCapture = (type = 'after') => {
    setCameraModalType(type);
    setCameraModalOpen(true);
  };

  const handleCameraCapture = ({ imageUrl, file, photoType, latitude, longitude, accuracy, address }) => {
    if (photoType === 'before') {
      setBeforeImageUrl(imageUrl);
      setBeforeImageFile(file);
    } else {
      setSolvedImageUrl(imageUrl);
      setSolvedImageFile(file);
      if (latitude && longitude) {
        setSolvedLatitude(latitude);
        setSolvedLongitude(longitude);
        setSolvedGpsAccuracy(accuracy || 10);
      }
      if (address) {
        setSolvedAddress(address);
      }
    }
  };

  const handleSolvedImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSolvedImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setSolvedImageUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBeforeImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBeforeImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setBeforeImageUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteActionSubmit = async (e) => {
    e.preventDefault();
    if (!solvedImageUrl && !solvedImageFile) {
      alert('Mandatory Requirement: You must upload or capture a resolution proof photo before marking the action completed.');
      return;
    }

    setCompletingAction(true);
    try {
      if (actionToComplete.isNewFromReport) {
        const reportTarget = actionToComplete.reportId;
        if (solvedImageFile) {
          const payload = new FormData();
          if (reportTarget) payload.append('reportId', reportTarget._id || reportTarget);
          payload.append('actionType', actionToComplete.actionType || 'Remediate Accident Zone');
          payload.append('problem', actionToComplete.problem || 'Animal accident hazard');
          payload.append('possibleCause', actionToComplete.possibleCause || 'Poor street lighting');
          payload.append('assignedDepartment', actionToComplete.assignedDepartment || 'Municipal Infrastructure & Safety');
          payload.append('targetArea', solvedAddress || reportTarget?.address || 'Municipal Road Sector');
          payload.append('status', 'COMPLETED');
          payload.append('image', solvedImageFile);
          if (beforeImageUrl) payload.append('beforeImageUrl', beforeImageUrl);
          payload.append('solvedNotes', solvedNotes || 'Remediation completed and verified on-site with live GPS geotag.');
          if (solvedLatitude) payload.append('solvedLatitude', solvedLatitude);
          if (solvedLongitude) payload.append('solvedLongitude', solvedLongitude);
          if (solvedGpsAccuracy) payload.append('solvedGpsAccuracy', solvedGpsAccuracy);
          payload.append('solvedAddress', solvedAddress || reportTarget?.address || 'Municipal road sector');
          await api.createAuthorityAction(payload);
        } else {
          await api.createAuthorityAction({
            reportId: reportTarget ? (reportTarget._id || reportTarget) : undefined,
            actionType: actionToComplete.actionType || 'Remediate Accident Zone',
            problem: actionToComplete.problem || 'Animal accident hazard',
            possibleCause: actionToComplete.possibleCause || 'Poor street lighting',
            assignedDepartment: actionToComplete.assignedDepartment || 'Municipal Infrastructure & Safety',
            targetArea: solvedAddress || reportTarget?.address || 'Municipal Road Sector',
            status: 'COMPLETED',
            solvedImageUrl: solvedImageUrl,
            beforeImageUrl: beforeImageUrl,
            solvedNotes: solvedNotes || 'Remediation completed and verified on-site with live GPS geotag.',
            solvedLatitude: solvedLatitude,
            solvedLongitude: solvedLongitude,
            solvedGpsAccuracy: solvedGpsAccuracy,
            solvedAddress: solvedAddress || reportTarget?.address || 'Municipal road sector',
          });
        }
      } else {
        const payload = {
          status: 'COMPLETED',
          solvedImageUrl: solvedImageUrl,
          beforeImageUrl: beforeImageUrl || actionToComplete.beforeImageUrl || actionToComplete.reportId?.imageUrl || '',
          solvedLatitude: solvedLatitude || actionToComplete.reportId?.latitude,
          solvedLongitude: solvedLongitude || actionToComplete.reportId?.longitude,
          solvedGpsAccuracy: solvedGpsAccuracy,
          solvedAddress: solvedAddress || actionToComplete.targetArea || '',
          solvedNotes: solvedNotes || 'Remediation completed and verified on-site with live GPS geotag.',
        };
        await api.updateAuthorityAction(actionToComplete._id, payload);
      }

      setShowCompleteModal(false);
      setActionToComplete(null);
      loadAllData();
      alert('✓ Authority action marked COMPLETED with verified resolution proof and live GPS coordinates!');
    } catch (err) {
      alert(err.message || 'Failed to mark action completed.');
    } finally {
      setCompletingAction(false);
    }
  };

  // Calculate Priority Score for Hotspots (Section 32 & 33)
  const calculatePriorityScore = (h) => {
    const reports = h.reportCount || 0;
    const riskFactor = h.riskLevel === 'HIGH' ? 8 : h.riskLevel === 'MEDIUM' ? 4 : 2;
    const unresolved = reports; // Active reports
    return reports * 3 + riskFactor + unresolved * 2;
  };

  const sortedHotspotsByPriority = [...hotspots].sort(
    (a, b) => calculatePriorityScore(b) - calculatePriorityScore(a)
  );

  const pendingActions = actions.filter((a) => a.status === 'PENDING');
  const inProgressActions = actions.filter((a) => a.status === 'IN_PROGRESS');
  const completedActions = actions.filter((a) => a.status === 'COMPLETED');

  const filteredActions = actions.filter((a) => {
    if (actionFilter === 'ALL') return true;
    return a.status === actionFilter;
  });

    const unreadAuthNotifications = notifications.filter((n) => !n.read).length;

  const authorityNav = [
    { key: 'overview', label: 'Priority Dashboard', icon: Shield },
    { key: 'problem-analysis', label: 'Problem Analysis', icon: BarChart3, badge: causeAnalysis?.totalReportsWithCauses ? `${causeAnalysis.totalReportsWithCauses} Causes` : null },
    { key: 'actions', label: 'Remediation Actions', icon: Wrench, badge: actions.length || null, badgeColor: '#7c3aed' },
    { key: 'hotspots', label: 'Hotspot Clusters', icon: AlertTriangle, badge: hotspots.length || null },
    { key: 'hotspot-map', label: 'Hotspot GIS Map', icon: MapPin },
    { key: 'reports', label: 'Accident Reports', icon: FileText, badge: reports.length || null },
    { key: 'resolved-proof', label: 'Before / After Proofs', icon: ShieldCheck, badge: completedActions.length || null, badgeColor: '#10b981' },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: activeSection === 'notifications' ? null : (unreadAuthNotifications > 0 ? unreadAuthNotifications : null),
      badgeColor: '#ef4444',
    },
    { key: 'profile', label: 'Authority Profile', icon: User },
  ];

  return (
    <RoleDashboardLayout
      role="authority"
      navItems={authorityNav}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7c3aed', fontWeight: 700, fontSize: '0.825rem', textTransform: 'uppercase' }}>
              <Shield size={18} /> Municipal Road Safety & Problem Resolution Authority
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {activeSection === 'overview' && 'Accident Hotspot Governance & Problem Resolution'}
              {activeSection === 'problem-analysis' && 'Citizen-Reported Contributing Factors & Cause Analysis'}
              {activeSection === 'actions' && 'Infrastructure Remediation Actions'}
              {activeSection === 'hotspots' && 'DBSCAN Spatial Hotspot Clusters'}
              {activeSection === 'hotspot-map' && 'Interactive GIS Hotspot Density Map'}
              {activeSection === 'reports' && 'City-Wide Animal Accident Log'}
              {activeSection === 'resolved-proof' && 'Resolution Proof Gallery (Before & After)'}
              {activeSection === 'notifications' && 'Road Safety Authority Notifications'}
              {activeSection === 'profile' && 'Municipal Department Profile'}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button
              onClick={handleRecalculateHotspots}
              disabled={recalculating}
              className="btn btn-sm btn-secondary"
              style={{ color: '#7c3aed', borderColor: '#ddd6fe' }}
            >
              <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
              {recalculating ? 'Recalculating...' : 'Recalculate DBSCAN'}
            </button>
            <button
              onClick={() => handleOpenCreateActionModal()}
              className="btn btn-sm btn-primary"
              style={{ background: '#7c3aed' }}
            >
              <Plus size={14} /> Create Remediation Action
            </button>
          </div>
        </div>

        {/* ================= AUTHORITY 5-STAGE WORKFLOW PIPELINE ================= */}
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
              <Sparkles size={18} color="#a78bfa" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Municipal Authority 5-Stage Civic Remediation Pipeline
              </h3>
            </div>
            <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
              From spatial DBSCAN & citizen cause analysis to photo-verified resolution
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {AUTHORITY_WORKFLOW_STEPS.map((ws) => {
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
                        background: '#7c3aed',
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
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c4b5fd' }}>
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

        {/* ================= SECTION 1: OVERVIEW & PRIORITY ACTIONS ================= */}
        {activeSection === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Stat Cards */}
            <div className="dashboard-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                  <Layers size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                    {hotspots.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    Active Hotspot Clusters
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>
                    {hotspots.filter((h) => h.riskLevel === 'HIGH').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    High-Risk Hotspots
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <Clock size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>
                    {pendingActions.length + inProgressActions.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    Pending / In-Progress Actions
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a' }}>
                    {completedActions.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    Photo-Verified Resolutions
                  </div>
                </div>
              </div>
            </div>

            {/* FRONT PROMINENT CARD: Citizen Filed Complaints & Incident Log */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', border: '2px solid #ddd6fe', background: '#ffffff', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📋 Citizen-Filed Accident Reports & Road Hazard Logs
                    </h3>
                    <p style={{ fontSize: '0.775rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Live incident filings submitted by citizens. Inspect contributing factors and initiate civil works (lighting, road repairs, signage).
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#059669', background: '#d1fae5', padding: '0.3rem 0.65rem', borderRadius: '999px', fontWeight: 700 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                    Live Municipal Feed
                  </div>
                  <span className="badge badge-purple">{reports.length} Filed Reports</span>
                  <button onClick={() => setActiveSection('reports')} className="btn btn-sm btn-secondary" style={{ color: '#7c3aed', fontWeight: 700 }}>
                    View All ({reports.length}) →
                  </button>
                </div>
              </div>

              {reports.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    No accident reports filed yet. When citizens file complaints, they will appear here with causes and photos.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
                  {reports.slice(0, 4).map((r) => (
                    <div
                      key={r._id}
                      style={{
                        padding: '1.15rem',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                            {getAnimalEmoji(r.animalType)} {r.animalType} ({r.reportId})
                          </span>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <span className="badge badge-warning">{r.severity || 'Moderate'}</span>
                            <span className="badge badge-teal">{r.status || 'PENDING'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          {r.imageUrl && (
                            <img
                              src={r.imageUrl}
                              alt="Accident Evidence"
                              style={{ width: '75px', height: '75px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '1px solid #cbd5e1' }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600, margin: '0 0 3px 0', lineHeight: 1.3 }}>
                              {r.description}
                            </p>
                            <div style={{ fontSize: '0.75rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <MapPin size={13} color="#7c3aed" />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.address}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                              GPS: <strong>{r.latitude != null ? Number(r.latitude).toFixed(4) : 'N/A'}, {r.longitude != null ? Number(r.longitude).toFixed(4) : 'N/A'}</strong>
                            </div>
                          </div>
                        </div>

                        {Array.isArray(r.possibleCauses) && r.possibleCauses.length > 0 && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Suspected Hazards:</span>
                            {r.possibleCauses.map((c, i) => (
                              <span key={i} style={{ background: '#ede9fe', color: '#7c3aed', fontSize: '0.675rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateActionModal(null, r)}
                          className="btn btn-sm btn-primary"
                          style={{ flex: 1, background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700, fontSize: '0.75rem', padding: '0.4rem' }}
                        >
                          🛠️ Log Remediation Action
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🚨 PRIORITY ACTIONS SECTION (Section 32) */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', borderLeft: '5px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={22} color="#ef4444" /> 🚨 Priority Actions for Authority
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    What problem should the authority solve first? Ranked by accident frequency, risk severity, and citizen cause clustering.
                  </p>
                </div>
                <button onClick={() => setActiveSection('actions')} className="btn btn-sm btn-secondary" style={{ color: '#7c3aed' }}>
                  View All Actions ({actions.length}) →
                </button>
              </div>

              {sortedHotspotsByPriority.length === 0 && reports.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <MapPin size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155' }}>📍 No accident reports available yet.</h4>
                  <p style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '440px', margin: '0.25rem auto 0' }}>
                    As citizens submit on-site accident reports with environmental hazard causes, DBSCAN will discover danger hotspots and rank them here automatically.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                  {sortedHotspotsByPriority.slice(0, 3).map((h, idx) => {
                    const score = calculatePriorityScore(h);
                    return (
                      <div
                        key={h._id}
                        style={{
                          background: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          padding: '1.1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className={`badge ${getRiskColorClass(h.riskLevel)}`}>
                              #{idx + 1} {h.riskLevel} RISK (Priority Score: {score})
                            </span>
                            <span className="badge badge-gray">{h.reportCount} Accidents</span>
                          </div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                            {h.name}
                          </h3>
                          <div style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '0.5rem' }}>
                            Primary Animal: <strong style={{ color: '#0f172a' }}>{h.dominantAnimal || 'Dog / Cattle'}</strong> • Radius: {h.radius}m
                          </div>

                          <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                              Top Citizen-Reported Cause:
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>
                              {h.mostFrequentCause || 'Poor street lighting & high vehicle speed'}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenCreateActionModal(h)}
                          className="btn btn-sm btn-primary"
                          style={{ width: '100%', background: '#7c3aed', fontWeight: 700, justifyContent: 'center' }}
                        >
                          <Wrench size={14} /> Deploy Remediation Action
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PROBLEM ANALYSIS SUMMARY & QUICK GIS MAP */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
              {/* Problem Analysis Card */}
              <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={20} color="#7c3aed" /> Citizen Cause Analytics
                  </h3>
                  <button onClick={() => setActiveSection('problem-analysis')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    Full Analysis →
                  </button>
                </div>
                <p style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '1rem' }}>
                  Most frequently reported contributing factors from citizen accident reports.
                </p>

                {causeAnalysis && causeAnalysis.distribution && causeAnalysis.distribution.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {causeAnalysis.distribution.slice(0, 4).map((c, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 700, marginBottom: '4px' }}>
                          <span style={{ color: '#0f172a' }}>{c.cause}</span>
                          <span style={{ color: '#7c3aed' }}>{c.percentage}% ({c.count})</span>
                        </div>
                        <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${c.percentage}%`, background: '#7c3aed', borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    No citizen cause reports recorded yet.
                  </div>
                )}
              </div>

              {/* GIS Hotspot Map Card */}
              <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={20} color="#7c3aed" /> Danger Corridor Map
                  </h3>
                  <button onClick={() => setActiveSection('hotspot-map')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    Fullscreen Map →
                  </button>
                </div>
                <GisMap center={[8.7138, 77.7568]} zoom={13} hotspots={hotspots} height="320px" />
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: PROBLEM ANALYSIS (Section 10 & 11) ================= */}
        {activeSection === 'problem-analysis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                    📊 Citizen-Reported Contributing Factors & Problem Analysis
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', maxWidth: '780px' }}>
                    Helping authorities understand: <em>"WHY are animal accidents happening in this particular area?"</em> Percentages are aggregated in real-time from citizen accident submissions in MongoDB.
                  </p>
                </div>
                <div className="badge badge-teal" style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}>
                  Database Aggregation: {causeAnalysis?.totalReportsWithCauses || 0} Evaluated Reports
                </div>
              </div>

              {/* Primary & Secondary Suspected Causes Highlight */}
              {causeAnalysis && causeAnalysis.distribution && causeAnalysis.distribution.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem 1.25rem', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase' }}>
                      Primary Suspected Contributing Factor
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b', marginTop: '3px' }}>
                      {causeAnalysis.distribution[0]?.cause}
                    </div>
                    <div style={{ fontSize: '0.775rem', color: '#7f1d1d', marginTop: '2px' }}>
                      Mentioned in {causeAnalysis.distribution[0]?.percentage}% of citizen submissions ({causeAnalysis.distribution[0]?.count} reports)
                    </div>
                  </div>

                  {causeAnalysis.distribution[1] && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '1rem 1.25rem', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                        Secondary Suspected Contributing Factor
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#92400e', marginTop: '3px' }}>
                        {causeAnalysis.distribution[1]?.cause}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: '#78350f', marginTop: '2px' }}>
                        Mentioned in {causeAnalysis.distribution[1]?.percentage}% of citizen submissions ({causeAnalysis.distribution[1]?.count} reports)
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recharts Bar Chart of Causes */}
              {causeAnalysis && causeAnalysis.distribution && causeAnalysis.distribution.length > 0 ? (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
                    Citizen-Reported Contributing Factors Breakdown (%)
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={causeAnalysis.distribution} layout="vertical" margin={{ left: 80, right: 30, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" unit="%" domain={[0, 100]} />
                      <YAxis type="category" dataKey="cause" width={180} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(val) => [`${val}%`, 'Prevalence']} />
                      <Bar dataKey="percentage" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <BarChart3 size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155' }}>No citizen cause reports recorded yet.</h4>
                  <p style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '440px', margin: '0.25rem auto 0' }}>
                    When citizens submit accident reports and select suspected causes (lighting, speed, garbage), real-time statistics will populate here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= SECTION 3: ACTIONS & RESOLUTION ================= */}
        {activeSection === 'actions' && (() => {
          const actionCounts = {
            ALL: actions.length,
            PENDING: actions.filter((a) => a.status === 'PENDING').length,
            IN_PROGRESS: actions.filter((a) => a.status === 'IN_PROGRESS').length,
            COMPLETED: actions.filter((a) => a.status === 'COMPLETED').length,
          };

          const ACTION_STAGE_CONFIGS = [
            {
              key: 'PENDING',
              label: '1. Pending Squad Dispatch & Scheduling',
              desc: 'Remediation actions scheduled for field deployment by engineering team.',
              color: '#d97706',
              bg: '#fffbeb',
              border: '#fde68a',
            },
            {
              key: 'IN_PROGRESS',
              label: '2. Remediation Work In Progress On-Site',
              desc: 'Civic squads actively installing barriers, warning signs, lights, or speed breakers.',
              color: '#2563eb',
              bg: '#eff6ff',
              border: '#bfdbfe',
            },
            {
              key: 'COMPLETED',
              label: '3. Completed & Verified Resolution Proof',
              desc: 'Infrastructure defects fixed and verified with photographic before/after evidence.',
              color: '#16a34a',
              bg: '#f0fdf4',
              border: '#bbf7d0',
            },
          ];

          const renderActionCard = (act) => (
            <div
              key={act._id}
              className="card"
              style={{
                padding: '1.35rem',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: `5px solid ${act.status === 'COMPLETED' ? '#10b981' : act.status === 'IN_PROGRESS' ? '#3b82f6' : '#f59e0b'}`,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className={`badge ${act.priority === 'HIGH' ? 'badge-risk-high' : 'badge-risk-medium'}`}>
                    {act.priority || 'HIGH'} PRIORITY
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: act.status === 'COMPLETED' ? '#dcfce7' : act.status === 'IN_PROGRESS' ? '#dbeafe' : '#fef3c7',
                      color: act.status === 'COMPLETED' ? '#16a34a' : act.status === 'IN_PROGRESS' ? '#1d4ed8' : '#b45309',
                    }}
                  >
                    {act.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                  {act.actionType}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
                  <strong>Problem:</strong> {act.problem || act.description}
                </div>

                {act.possibleCause && (
                  <div style={{ fontSize: '0.75rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.4rem 0.65rem', borderRadius: '6px', marginBottom: '0.5rem', display: 'inline-block' }}>
                    Cause: <strong>{act.possibleCause}</strong>
                  </div>
                )}

                <div style={{ fontSize: '0.725rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  🏢 Dept: <strong>{act.assignedDepartment || 'Road Safety Wing'}</strong>
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  📍 Target Area: {act.targetArea || 'City Corridor'}
                </div>

                {act.solvedImageUrl && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={13} /> Resolution Photo Proof Verified:
                    </span>
                    <img
                      src={act.solvedImageUrl}
                      alt="Resolution Proof"
                      style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginTop: '4px', border: '1px solid #e2e8f0' }}
                    />
                    {act.solvedNotes && (
                      <p style={{ fontSize: '0.725rem', color: '#475569', fontStyle: 'italic', marginTop: '4px' }}>
                        "{act.solvedNotes}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                {act.status === 'PENDING' && (
                  <button
                    onClick={() => handleStartAction(act._id)}
                    className="btn btn-sm btn-primary"
                    style={{ background: '#3b82f6', width: '100%', justifyContent: 'center' }}
                  >
                    Start Remediation Work (In Progress)
                  </button>
                )}

                {act.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleOpenCompleteModal(act)}
                    className="btn btn-sm btn-primary"
                    style={{ background: '#10b981', width: '100%', justifyContent: 'center' }}
                  >
                    <Camera size={14} /> Upload Solved Photo & Mark Completed
                  </button>
                )}

                {act.status === 'COMPLETED' && (
                  <button
                    onClick={() => setInspectedAction(act)}
                    className="btn btn-sm btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', color: '#10b981' }}
                  >
                    <Eye size={14} /> View Before & After Proof
                  </button>
                )}
              </div>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Infrastructure Remediation Actions ({actions.length})
                  </h2>
                  <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    Deploy warning signs, streetlights, speed breakers, or waste cleanup arranged by remediation stage.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px' }}>
                    {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((f) => {
                      const count = actionCounts[f] ?? 0;
                      const isSel = actionFilter === f;
                      return (
                        <button
                          key={f}
                          onClick={() => setActionFilter(f)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: 'none',
                            background: isSel ? '#7c3aed' : 'transparent',
                            color: isSel ? '#ffffff' : '#64748b',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span>{f}</span>
                          <span style={{ fontSize: '0.675rem', background: isSel ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: isSel ? '#ffffff' : '#475569', padding: '1px 5px', borderRadius: '8px' }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => handleOpenCreateActionModal()} className="btn btn-primary" style={{ background: '#7c3aed' }}>
                    <Plus size={16} /> New Action
                  </button>
                </div>
              </div>

              {filteredActions.length === 0 ? (
                <div className="card" style={{ padding: '3.5rem', textAlign: 'center', borderRadius: '16px' }}>
                  <Wrench size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#334155' }}>No authority actions found in {actionFilter} stage.</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '420px', margin: '0.25rem auto 1rem' }}>
                    Identify accident causes and create an infrastructure remediation plan for your road safety squad.
                  </p>
                  <button onClick={() => handleOpenCreateActionModal()} className="btn btn-primary" style={{ background: '#7c3aed' }}>
                    <Plus size={16} /> Create First Remediation Action
                  </button>
                </div>
              ) : actionFilter === 'ALL' ? (
                /* Grouped under respective stages when viewing ALL */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {ACTION_STAGE_CONFIGS.map((stage) => {
                    const stageActions = filteredActions.filter((a) => a.status === stage.key);
                    if (stageActions.length === 0) return null;
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
                                  {stageActions.length} {stageActions.length === 1 ? 'action' : 'actions'}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>{stage.desc}</p>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                          {stageActions.map((act) => renderActionCard(act))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Filtered flat list */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  {filteredActions.map((act) => renderActionCard(act))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= SECTION 4: HOTSPOTS ================= */}
        {activeSection === 'hotspots' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  DBSCAN Hotspot Clusters ({hotspots.length})
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                  Spatial clusters detected using ε=450m radius and MinPts=2 threshold with citizen cause aggregation.
                </p>
              </div>
              <button onClick={handleRecalculateHotspots} className="btn btn-secondary" disabled={recalculating} style={{ color: '#7c3aed' }}>
                <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} /> Recalculate
              </button>
            </div>

            {hotspots.length === 0 ? (
              <div className="card" style={{ padding: '3.5rem', textAlign: 'center', borderRadius: '16px' }}>
                <AlertTriangle size={38} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#334155' }}>No accident hotspots detected.</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '420px', margin: '0.25rem auto' }}>
                  When multiple accident reports occur within 450 meters, DBSCAN will cluster them into high-risk danger corridors automatically.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                {hotspots.map((h) => (
                  <div key={h._id} className="card" style={{ padding: '1.25rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span className={`badge ${getRiskColorClass(h.riskLevel)}`}>{h.riskLevel} RISK</span>
                        <span className="badge badge-gray">{h.reportCount} Incidents</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{h.name}</h3>
                      <p style={{ fontSize: '0.775rem', color: '#64748b' }}>
                        Radius: {h.radius}m • Dominant Species: <strong>{h.dominantAnimal || 'Dog'}</strong>
                      </p>

                      <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '0.75rem 0' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          Primary Citizen-Reported Cause:
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>
                          {h.mostFrequentCause || 'Poor street lighting'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenCreateActionModal(h)}
                      className="btn btn-sm btn-primary"
                      style={{ background: '#7c3aed', width: '100%', justifyContent: 'center' }}
                    >
                      <Plus size={14} /> Create Remediation Action
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 5: GIS MAP ================= */}
        {activeSection === 'hotspot-map' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Interactive Hotspot Density GIS Map
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Visualizing high-risk danger corridors and spatial clusters for road engineering planning.
            </p>
            <GisMap center={[8.7138, 77.7568]} zoom={13} hotspots={hotspots} height="600px" />
          </div>
        )}

        {/* ================= SECTION 6: REPORTS LOG ================= */}
        {activeSection === 'reports' && (() => {
          const reportCounts = {
            ALL: reports.length,
            PENDING: reports.filter((r) => getReportStage(r) === 'PENDING').length,
            ACCEPTED: reports.filter((r) => getReportStage(r) === 'ACCEPTED').length,
            'ON THE WAY': reports.filter((r) => getReportStage(r) === 'ON THE WAY').length,
            RESCUED: reports.filter((r) => getReportStage(r) === 'RESCUED').length,
            COMPLETED: reports.filter((r) => getReportStage(r) === 'COMPLETED').length,
            DUPLICATE: reports.filter((r) => getReportStage(r) === 'DUPLICATE').length,
          };

          const filteredAuthReports = reports
            .filter((r) => {
              const stage = getReportStage(r);
              const matchesFilter = reportFilter === 'ALL' || stage === reportFilter;
              const matchesSearch =
                !reportSearch ||
                r.reportId?.toLowerCase().includes(reportSearch.toLowerCase()) ||
                r.description?.toLowerCase().includes(reportSearch.toLowerCase()) ||
                r.address?.toLowerCase().includes(reportSearch.toLowerCase()) ||
                r.animalType?.toLowerCase().includes(reportSearch.toLowerCase());
              return matchesFilter && matchesSearch;
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          const renderAuthReportCard = (r) => (
            <div key={r._id} style={{ padding: '1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                    {getAnimalEmoji(r.animalType)} {r.reportId}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span>
                </div>
                {r.imageUrl && (
                  <img src={r.imageUrl} alt="Animal" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', margin: '6px 0' }} />
                )}
                <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0' }}>📍 {r.address}</div>

                {r.possibleCauses && r.possibleCauses.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>Reported Causes:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                      {r.possibleCauses.map((c, i) => (
                        <span key={i} style={{ background: '#f3e8ff', color: '#7c3aed', padding: '2px 6px', borderRadius: '4px', fontSize: '0.675rem', fontWeight: 700 }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {r.citizenObservation && (
                  <p style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', marginTop: '6px' }}>
                    "{r.citizenObservation}"
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  onClick={() => handleOpenCompleteModal(r)}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#10b981', flex: 1, justifyContent: 'center', fontSize: '0.725rem' }}
                >
                  <Camera size={12} /> Attach Proof
                </button>
                <button
                  onClick={() => handleOpenCreateActionModal(null, r)}
                  className="btn btn-sm btn-secondary"
                  style={{ color: '#7c3aed', flex: 1, justifyContent: 'center', fontSize: '0.725rem' }}
                >
                  <Plus size={12} /> Plan Action
                </button>
              </div>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    City-Wide Accident Reports Stream ({reports.length})
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Inspect on-site citizen observations and identified contributing factors organized by rescue stage.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.775rem' }}
                  />
                  {['ALL', 'PENDING', 'ACCEPTED', 'ON THE WAY', 'RESCUED', 'COMPLETED', 'DUPLICATE'].map((st) => {
                    const count = reportCounts[st] ?? 0;
                    const isSel = reportFilter === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setReportFilter(st)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          border: isSel ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                          background: isSel ? '#7c3aed' : '#ffffff',
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

              {filteredAuthReports.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                  <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155' }}>No accident reports found in {reportFilter} stage.</h4>
                </div>
              ) : reportFilter === 'ALL' && !reportSearch ? (
                /* Grouped by Stage when viewing ALL */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {REPORT_STAGE_CONFIGS.map((stage) => {
                    const stageReports = filteredAuthReports.filter((r) => getReportStage(r) === stage.key);
                    if (stageReports.length === 0) return null;
                    return (
                      <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                                  {stageReports.length} {stageReports.length === 1 ? 'report' : 'reports'}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>{stage.desc}</p>
                            </div>
                          </div>
                          <button onClick={() => setReportFilter(stage.key)} style={{ background: 'transparent', border: 'none', color: stage.color, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                            Filter this stage only →
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                          {stageReports.map(renderAuthReportCard)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Flat grid when specific filter chosen */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {filteredAuthReports.map(renderAuthReportCard)}
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= SECTION 7: BEFORE / AFTER PROOFS (Section 18) ================= */}
        {activeSection === 'resolved-proof' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                  🛡️ Resolution Photo Proof Gallery (Before & After)
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Mandatory photographic evidence uploaded by municipal safety authorities proving completed infrastructure fixes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCompleteModal()}
                className="btn btn-primary"
                style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
              >
                <Camera size={16} /> 📸 Attach Resolution Proof
              </button>
            </div>

            {completedActions.length === 0 ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                <ShieldCheck size={38} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155' }}>No completed remediation actions yet.</h4>
                <p style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '400px', margin: '0.25rem auto' }}>
                  When authorities execute actions and upload mandatory resolution photos, they will be archived here for civic auditing.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenCompleteModal()}
                  className="btn btn-primary"
                  style={{ background: '#10b981', marginTop: '1rem', fontWeight: 800 }}
                >
                  <Camera size={15} /> 📸 Attach Resolution Proof Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {completedActions.map((act) => (
                  <div key={act._id} style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <span className="badge badge-teal" style={{ marginRight: '0.5rem' }}>COMPLETED</span>
                        <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{act.actionType}</strong>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Resolved: {new Date(act.completedDate || act.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.825rem', color: '#475569', marginBottom: '0.75rem' }}>
                      <strong>Problem Addressed:</strong> {act.problem} • <strong>Target Area:</strong> {act.targetArea}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {/* Before (Report Photo) */}
                      <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertTriangle size={14} /> BEFORE: Citizen Incident / Hazard
                        </div>
                        {(act.beforeImageUrl || act.reportId?.imageUrl) ? (
                          <img
                            src={act.beforeImageUrl || act.reportId?.imageUrl}
                            alt="Before"
                            style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '180px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '0.75rem', gap: '4px' }}>
                            <AlertTriangle size={20} color="#f87171" />
                            <span>No hazard photo on report</span>
                          </div>
                        )}
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                          Citizen Reported Hazard: {act.possibleCause || 'Poor road lighting & speed'}
                        </div>
                      </div>

                      {/* After (Authority Solved Proof) */}
                      <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={14} /> AFTER: Authority Resolution Photo Proof
                        </div>
                        {act.solvedImageUrl ? (
                          <img
                            src={act.solvedImageUrl}
                            alt="After"
                            style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '180px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '0.75rem', gap: '4px' }}>
                            <Camera size={20} color="#10b981" />
                            <span>Resolution proof pending</span>
                          </div>
                        )}
                        <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
                          ✓ Solved Notes: {act.solvedNotes || 'Remediation completed and verified.'}
                        </div>
                      </div>
                    </div>

                    {/* Live GPS Geotag info */}
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.65rem 0.85rem', borderRadius: '8px', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#047857' }}>
                        <MapPin size={14} />
                        <span>
                          {act.solvedLatitude && act.solvedLongitude
                            ? `GPS: ${act.solvedLatitude.toFixed(5)}, ${act.solvedLongitude.toFixed(5)} ${act.solvedGpsAccuracy ? `(±${act.solvedGpsAccuracy}m accuracy)` : ''}`
                            : (act.reportId?.latitude && act.reportId?.longitude
                                ? `GPS: ${act.reportId.latitude.toFixed(5)}, ${act.reportId.longitude.toFixed(5)}`
                                : 'Geotagged On-Site Verification')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#065f46', marginTop: '2px' }}>
                        📍 {act.solvedAddress || act.targetArea || 'Municipal road remediation sector'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 8: NOTIFICATIONS ================= */}
        {activeSection === 'notifications' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Road Safety Authority Notifications</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Click any notification to immediately mark it as read. Read notifications will remain cleared.
                </p>
              </div>

              {notifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={handleMarkAllNotificationsRead}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                  }}
                >
                  <Check size={14} /> Mark All as Read
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No notifications recorded.
                </div>
              ) : (
                notifications.map((n) => {
                  const notifId = n._id || n.id;
                  const isRead = Boolean(n.read || readNotifIds.has(notifId));

                  return (
                    <div
                      key={notifId}
                      onClick={() => handleMarkNotificationRead(notifId)}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        background: isRead ? '#f8fafc' : '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #7c3aed',
                        cursor: 'pointer',
                        boxShadow: isRead ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                        transition: 'all 0.15s ease',
                        opacity: isRead ? 0.75 : 1,
                      }}
                      title="Click to mark as read"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{n.title}</h4>
                          {!isRead && (
                            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '10px' }}>
                              NEW
                            </span>
                          )}
                          {isRead && (
                            <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>
                              READ
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {new Date(n.createdAt || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 0 0' }}>{n.message}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= SECTION 9: PROFILE ================= */}
        {activeSection === 'profile' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', maxWidth: '680px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Municipal Authority Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Department</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>City Road Safety & Urban Traffic Engineering Authority</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Authority Scope</span>
                <div style={{ fontSize: '0.875rem', color: '#334155' }}>DBSCAN Hotspot Identification, Cause Analytics, and Infrastructure Remediation</div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CREATE ACTION MODAL ================= */}
        {showCreateActionModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setShowCreateActionModal(false)}
          >
            <div
              style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                🛠️ Create Resolution Action
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Assign an engineering or sanitation task to address identified accident causes.
              </p>

              <form onSubmit={handleCreateActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Target Problem:
                  </label>
                  <input
                    type="text"
                    required
                    value={newAction.problem}
                    onChange={(e) => setNewAction({ ...newAction, problem: e.target.value })}
                    placeholder="e.g. Repeated cattle collisions due to poor night lighting"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                      Citizen-Reported Cause:
                    </label>
                    <select
                      value={newAction.possibleCause}
                      onChange={(e) => setNewAction({ ...newAction, possibleCause: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      {PREDEFINED_CAUSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                      Remediation Action:
                    </label>
                    <select
                      value={newAction.actionType}
                      onChange={(e) => setNewAction({ ...newAction, actionType: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      {PREDEFINED_ACTIONS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                      Assigned Department:
                    </label>
                    <select
                      value={newAction.assignedDepartment}
                      onChange={(e) => setNewAction({ ...newAction, assignedDepartment: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      {PREDEFINED_DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                      Priority:
                    </label>
                    <select
                      value={newAction.priority}
                      onChange={(e) => setNewAction({ ...newAction, priority: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      <option value="HIGH">🔴 HIGH Priority</option>
                      <option value="MEDIUM">🟡 MEDIUM Priority</option>
                      <option value="LOW">🟢 LOW Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Target Completion Date (Optional):
                  </label>
                  <input
                    type="date"
                    value={newAction.targetDate}
                    onChange={(e) => setNewAction({ ...newAction, targetDate: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Action Notes & Deployment Instructions:
                  </label>
                  <textarea
                    rows={2}
                    value={newAction.notes}
                    onChange={(e) => setNewAction({ ...newAction, notes: e.target.value })}
                    placeholder="e.g. Install 4 solar-powered 60W LED streetlights along South Bypass."
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowCreateActionModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', fontWeight: 800 }}>
                    Create Action
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= COMPLETE ACTION & MANDATORY SOLVED PHOTO MODAL ================= */}
        {showCompleteModal && actionToComplete && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setShowCompleteModal(false)}
          >
            <div
              style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '0.25rem' }}>
                <Camera size={22} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  Upload Resolution Photo Proof & Live GPS
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                <strong>Mandatory Verification:</strong> Use your live device camera or file upload to capture Before (hazard) and After (solved) photo evidence along with verified GPS coordinates.
              </p>
              <form onSubmit={handleCompleteActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {actionToComplete.isNewFromReport && reports.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                      Select Citizen Incident to Resolve:
                    </label>
                    <select
                      value={actionToComplete.reportId?._id || actionToComplete.reportId || ''}
                      onChange={(e) => {
                        const rep = reports.find((r) => r._id === e.target.value);
                        if (rep) {
                          handleOpenCompleteModal(rep);
                        }
                      }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    >
                      {reports.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.reportId} - {r.animalType} ({r.address || 'GPS Location'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Action Being Completed:</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{actionToComplete.actionType}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>Problem: {actionToComplete.problem}</div>
                </div>

                {/* 1. BEFORE PHOTO PROOF SECTION */}
                <div style={{ background: '#fff1f2', padding: '0.85rem', borderRadius: '10px', border: '1px solid #fecdd3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.775rem', fontWeight: 800, color: '#be123c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={14} /> 1. BEFORE PHOTO (Hazard / Incident):
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOpenCapture('before')}
                      style={{
                        background: '#be123c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Camera size={12} /> Open Live Camera
                    </button>
                  </div>

                  {beforeImageUrl ? (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <img
                        src={beforeImageUrl}
                        alt="Before Preview"
                        style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #fda4af' }}
                      />
                      <div style={{ fontSize: '0.7rem', color: '#881337', flex: 1 }}>
                        ✓ Before photo attached. You can take a new photo with camera or choose file.
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.725rem', color: '#9f1239' }}>
                      No Before photo attached. Click camera or upload below:
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBeforeImageUpload}
                    style={{ width: '100%', marginTop: '6px', fontSize: '0.75rem' }}
                  />
                </div>

                {/* 2. AFTER SOLVED PHOTO PROOF SECTION */}
                <div style={{ background: '#f0fdf4', padding: '0.85rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.775rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> 2. AFTER PHOTO (Mandatory Solved Proof):
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOpenCapture('after')}
                      style={{
                        background: '#15803d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.725rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(21, 128, 61, 0.3)',
                      }}
                    >
                      <Camera size={13} /> 📸 Live Camera with GPS
                    </button>
                  </div>

                  {solvedImageUrl ? (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '6px' }}>
                      <img
                        src={solvedImageUrl}
                        alt="Solved Preview"
                        style={{ width: '90px', height: '65px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #86efac' }}
                      />
                      <div style={{ fontSize: '0.725rem', color: '#166534', flex: 1 }}>
                        <div style={{ fontWeight: 800 }}>✓ Solved Proof Captured!</div>
                        {solvedLatitude && solvedLongitude && (
                          <div style={{ fontSize: '0.675rem', color: '#047857', marginTop: '2px' }}>
                            📍 GPS: {solvedLatitude.toFixed(5)}, {solvedLongitude.toFixed(5)} (±{solvedGpsAccuracy || 10}m)
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.725rem', color: '#166534', marginBottom: '6px' }}>
                      Open device camera above for geotagged photo proof, or choose file / quick preset:
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSolvedImageUpload}
                    style={{ width: '100%', fontSize: '0.75rem', marginBottom: '6px' }}
                  />
                </div>

                {/* 3. LIVE GPS GEOTAG STATUS */}
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} color="#0d9488" /> 3. Verification GPS Coordinates:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '4px' }}>
                    <div>
                      <label style={{ fontSize: '0.675rem', color: '#64748b' }}>Latitude:</label>
                      <input
                        type="number"
                        step="any"
                        value={solvedLatitude || ''}
                        onChange={(e) => setSolvedLatitude(parseFloat(e.target.value))}
                        placeholder="8.7138"
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.675rem', color: '#64748b' }}>Longitude:</label>
                      <input
                        type="number"
                        step="any"
                        value={solvedLongitude || ''}
                        onChange={(e) => setSolvedLongitude(parseFloat(e.target.value))}
                        placeholder="77.7568"
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Solved Notes & Summary:
                  </label>
                  <textarea
                    rows={2}
                    value={solvedNotes}
                    onChange={(e) => setSolvedNotes(e.target.value)}
                    placeholder="e.g. Installed 4 high-luminosity solar streetlights and trimmed overgrown shrubs on-site."
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowCompleteModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!solvedImageUrl && !solvedImageFile}
                    className="btn btn-primary"
                    style={{
                      background: '#10b981',
                      fontWeight: 800,
                      opacity: !solvedImageUrl && !solvedImageFile ? 0.5 : 1,
                      cursor: !solvedImageUrl && !solvedImageFile ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {completingAction ? 'Completing...' : '✓ Confirm & Upload Solved Proof'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= BEFORE / AFTER INSPECTION MODAL ================= */}
        {inspectedAction && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setInspectedAction(null)}
          >
            <div
              style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  🛡️ Case Resolution Proof (Before & After)
                </h3>
                <span className="badge badge-teal">RESOLVED</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', marginBottom: '4px' }}>
                    BEFORE (Accident Incident)
                  </div>
                  {(inspectedAction.beforeImageUrl || inspectedAction.reportId?.imageUrl) ? (
                    <img
                      src={inspectedAction.beforeImageUrl || inspectedAction.reportId?.imageUrl}
                      alt="Before"
                      style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '160px', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#94a3b8', fontSize: '0.75rem', gap: '4px', border: '1px dashed #cbd5e1' }}>
                      <AlertTriangle size={20} color="#f87171" />
                      <span>No original incident photo</span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                    Cause: {inspectedAction.possibleCause || 'Hazard'}
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', marginBottom: '4px' }}>
                    AFTER (Authority Solved Proof)
                  </div>
                  {inspectedAction.solvedImageUrl ? (
                    <img
                      src={inspectedAction.solvedImageUrl}
                      alt="After"
                      style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '160px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#94a3b8', fontSize: '0.75rem', gap: '4px', border: '1px dashed #cbd5e1' }}>
                      <Camera size={20} color="#10b981" />
                      <span>Resolution proof pending</span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
                    {inspectedAction.solvedNotes || 'Work verified on site.'}
                  </div>
                </div>
              </div>

              {/* Geotagged GPS Details */}
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} />
                  <span>
                    {inspectedAction.solvedLatitude && inspectedAction.solvedLongitude
                      ? `GPS: ${inspectedAction.solvedLatitude.toFixed(5)}, ${inspectedAction.solvedLongitude.toFixed(5)} ${inspectedAction.solvedGpsAccuracy ? `(±${inspectedAction.solvedGpsAccuracy}m accuracy)` : ''}`
                      : (inspectedAction.reportId?.latitude && inspectedAction.reportId?.longitude
                          ? `GPS: ${inspectedAction.reportId.latitude.toFixed(5)}, ${inspectedAction.reportId.longitude.toFixed(5)}`
                          : 'Location Geotagged on Site')}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#065f46', marginTop: '2px' }}>
                  📍 {inspectedAction.solvedAddress || inspectedAction.targetArea || 'Municipal road remediation sector'}
                </div>
              </div>

              <button onClick={() => setInspectedAction(null)} className="btn btn-secondary" style={{ width: '100%' }}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* ================= LIVE CAMERA PROOF CAPTURE MODAL ================= */}
        <CameraProofCaptureModal
          isOpen={cameraModalOpen}
          onClose={() => setCameraModalOpen(false)}
          onCapture={handleCameraCapture}
          title={cameraModalType === 'before' ? 'Capture Before Hazard Photo Proof' : 'Capture After Resolution Photo Proof'}
          photoType={cameraModalType}
        />
      </div>
    </RoleDashboardLayout>
  );
}
