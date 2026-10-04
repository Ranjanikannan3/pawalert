import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Database,
  Sliders,
  Cpu,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Bell,
  User,
  Activity,
  Sparkles,
  Layers,
  HeartHandshake,
  AlertTriangle,
  Server,
  Lock,
  Eye,
  Camera,
  ArrowRight,
  FileText,
  BarChart3,
  Wrench,
  Check,
  MapPin,
  Upload,
  X,
} from 'lucide-react';
import CameraProofCaptureModal from '../components/CameraProofCaptureModal';
import RoleDashboardLayout from '../components/RoleDashboardLayout';
import GisMap from '../components/GisMap';
import { api } from '../services/api';
import { subscribeToLiveEvents } from '../services/socket';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  getReportStage,
  REPORT_STAGE_CONFIGS,
  getStatusBadgeClass,
  getAnimalEmoji,
} from '../utils/geoUtils';

const ADMIN_WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Incident & GIS Verification',
    desc: 'Audits real-time citizen submissions, spatial coordinates, and AI detection accuracy',
    icon: MapPin,
  },
  {
    step: 2,
    title: 'Cause Analytics & Hazards',
    desc: 'Aggregates environmental risk factors, poor lighting, obstructions, and vehicle speed patterns',
    icon: BarChart3,
  },
  {
    step: 3,
    title: 'DBSCAN Spatial Tuning',
    desc: 'Adjusts ε-neighborhood radius and MinPts density thresholds for high-risk zones',
    icon: Sliders,
  },
  {
    step: 4,
    title: 'Full-Lifecycle Civic Audit',
    desc: 'Inspects end-to-end case chain: Citizen → AI → NGO Rescue → Authority → Solved Proof',
    icon: ShieldCheck,
  },
];

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [systemStatus, setSystemStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [rescues, setRescues] = useState([]);
  const [actions, setActions] = useState([]);
  const [causeAnalysis, setCauseAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAuditReport, setSelectedAuditReport] = useState(null);
  const [reportFilter, setReportFilter] = useState('ALL');
  const [reportSearch, setReportSearch] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(new Set());

  const [dbscanParams, setDbscanParams] = useState({
    epsilon: 450,
    minPts: 2,
  });
  const [tuningSuccess, setTuningSuccess] = useState(false);

  // Camera & File Proof Resolution States
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [actionToComplete, setActionToComplete] = useState(null);
  const [beforeImageUrl, setBeforeImageUrl] = useState('');
  const [beforeImageFile, setBeforeImageFile] = useState(null);
  const [solvedImageUrl, setSolvedImageUrl] = useState('');
  const [solvedImageFile, setSolvedImageFile] = useState(null);
  const [solvedLatitude, setSolvedLatitude] = useState(null);
  const [solvedLongitude, setSolvedLongitude] = useState(null);
  const [solvedGpsAccuracy, setSolvedGpsAccuracy] = useState(null);
  const [solvedAddress, setSolvedAddress] = useState('');
  const [solvedNotes, setSolvedNotes] = useState('');
  const [completingAction, setCompletingAction] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraModalType, setCameraModalType] = useState('after');

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(loadAdminData, 8000);

    // Live Socket.IO listeners so all complaints, rescues & hotspots reflect immediately
    const unsubscribe = subscribeToLiveEvents({
      onNewReport: (data) => {
        console.log('⚡ [Admin Live Sync] Real-time accident report received:', data);
        loadAdminData();
      },
      onRescueUpdate: (data) => {
        console.log('⚡ [Admin Live Sync] NGO rescue status update received:', data);
        loadAdminData();
      },
      onAuthorityAction: (data) => {
        console.log('⚡ [Admin Live Sync] Authority remediation update received:', data);
        loadAdminData();
      },
      onHotspotUpdate: (data) => {
        console.log('⚡ [Admin Live Sync] Hotspot clusters recalculated:', data);
        loadAdminData();
      },
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

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
      await api.markAllNotificationsRead('admin');
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

  const loadAdminData = async () => {
    try {
      const [statusRes, usersRes, reportsRes, hotspotsRes, rescueRes, actionsRes, causesRes, notifRes] =
        await Promise.all([
          api.getSystemStatus().catch(() => ({})),
          api.getUsers().catch(() => ({})),
          api.getReports({ limit: 60 }).catch(() => ({})),
          api.getHotspots().catch(() => ({})),
          api.getRescueRequests().catch(() => ({})),
          api.getAuthorityActions().catch(() => ({})),
          api.getCauseAnalysis().catch(() => ({})),
          api.getNotifications('admin').catch(() => ({})),
        ]);

      if (statusRes.success) setSystemStatus(statusRes);
      if (usersRes.success) setUsers(usersRes.users || []);
      if (reportsRes.success) setReports(reportsRes.reports || []);
      if (hotspotsRes.success) setHotspots(hotspotsRes.hotspots || []);
      if (rescueRes.success) setRescues(rescueRes.requests || []);
      if (actionsRes.success) setActions(actionsRes.actions || []);
      if (causesRes.success) setCauseAnalysis(causesRes.data || causesRes);
      if (notifRes.success) {
        setNotifications((notifRes.notifications || []).map((n) => ({
          ...n,
          read: n.read || readNotifIds.has(n._id || n.id),
        })));
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDbscanParams = async (e) => {
    e.preventDefault();
    setTuningSuccess(false);
    try {
      await api.recalculateHotspots({
        epsilon: dbscanParams.epsilon,
        minPts: dbscanParams.minPts,
      });
      setTuningSuccess(true);
      setTimeout(() => setTuningSuccess(false), 3500);
      loadAdminData();
    } catch (e) {
      alert('Error updating DBSCAN hyperparameters.');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUser(userId, { role: newRole });
      loadAdminData();
    } catch (e) {}
  };

  const handleOpenCompleteModal = (target) => {
    if (!target) return;
    
    // Check if target is a Report or an AuthorityAction
    const isReport = Boolean(target.reportId && !target.actionType);
    let actionObj = target;
    
    if (isReport) {
      const existingAction = actions.find((a) => (a.reportId?._id || a.reportId) === target._id);
      if (existingAction) {
        actionObj = existingAction;
      } else {
        actionObj = {
          isNewFromReport: true,
          reportId: target,
          actionType: `Remediate ${target.animalType || 'Animal'} Accident Hazard`,
          problem: target.description || `Repeated animal accident hazard at ${target.address || 'location'}`,
          possibleCause: (target.possibleCauses && target.possibleCauses[0]) || target.rootCause || 'Poor street lighting',
          assignedDepartment: 'Municipal Road Safety & Infrastructure',
          targetArea: target.address || 'Municipal road sector',
          beforeImageUrl: target.imageUrl || '',
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
    const file = e.target.files?.[0];
    if (file) {
      setSolvedImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setSolvedImageUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBeforeImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBeforeImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setBeforeImageUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFetchCurrentGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(5));
          const lng = parseFloat(pos.coords.longitude.toFixed(5));
          const acc = Math.round(pos.coords.accuracy || 10);
          setSolvedLatitude(lat);
          setSolvedLongitude(lng);
          setSolvedGpsAccuracy(acc);
          if (!solvedAddress || solvedAddress.startsWith('GPS:')) {
            setSolvedAddress(`GPS: ${lat}, ${lng} (±${acc}m)`);
          }
        },
        () => {
          setSolvedLatitude(8.7138);
          setSolvedLongitude(77.7568);
          setSolvedGpsAccuracy(15);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
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
      let res;
      if (actionToComplete.isNewFromReport) {
        const reportTarget = actionToComplete.reportId;
        if (solvedImageFile) {
          const payload = new FormData();
          payload.append('reportId', reportTarget._id || reportTarget);
          payload.append('actionType', actionToComplete.actionType || 'Remediate Accident Zone');
          payload.append('problem', actionToComplete.problem || 'Animal accident hazard');
          payload.append('possibleCause', actionToComplete.possibleCause || 'Poor street lighting');
          payload.append('assignedDepartment', actionToComplete.assignedDepartment || 'Municipal Infrastructure & Safety');
          payload.append('targetArea', solvedAddress || reportTarget.address || 'Municipal Road Sector');
          payload.append('status', 'COMPLETED');
          payload.append('image', solvedImageFile);
          if (beforeImageUrl) payload.append('beforeImageUrl', beforeImageUrl);
          if (solvedLatitude) payload.append('solvedLatitude', solvedLatitude);
          if (solvedLongitude) payload.append('solvedLongitude', solvedLongitude);
          if (solvedGpsAccuracy) payload.append('solvedGpsAccuracy', solvedGpsAccuracy);
          if (solvedAddress) payload.append('solvedAddress', solvedAddress);
          payload.append('solvedNotes', solvedNotes || 'Verified infrastructure remediation photo proof attached with live GPS.');
          res = await api.createAuthorityAction(payload);
        } else {
          const payload = {
            reportId: reportTarget._id || reportTarget,
            actionType: actionToComplete.actionType || 'Remediate Accident Zone',
            problem: actionToComplete.problem || 'Animal accident hazard',
            possibleCause: actionToComplete.possibleCause || 'Poor street lighting',
            assignedDepartment: actionToComplete.assignedDepartment || 'Municipal Infrastructure & Safety',
            targetArea: solvedAddress || reportTarget.address || 'Municipal Road Sector',
            status: 'COMPLETED',
            solvedImageUrl: solvedImageUrl,
            beforeImageUrl: beforeImageUrl || reportTarget.imageUrl || '',
            solvedLatitude: solvedLatitude || reportTarget.latitude || 8.7138,
            solvedLongitude: solvedLongitude || reportTarget.longitude || 77.7568,
            solvedGpsAccuracy: solvedGpsAccuracy || 10,
            solvedAddress: solvedAddress || reportTarget.address || 'Municipal Road Sector',
            solvedNotes: solvedNotes || 'Verified infrastructure remediation photo proof attached with live GPS.',
          };
          res = await api.createAuthorityAction(payload);
        }
      } else {
        let payload;
        if (solvedImageFile) {
          payload = new FormData();
          payload.append('status', 'COMPLETED');
          payload.append('image', solvedImageFile);
          if (beforeImageUrl) payload.append('beforeImageUrl', beforeImageUrl);
          if (solvedLatitude) payload.append('solvedLatitude', solvedLatitude);
          if (solvedLongitude) payload.append('solvedLongitude', solvedLongitude);
          if (solvedGpsAccuracy) payload.append('solvedGpsAccuracy', solvedGpsAccuracy);
          if (solvedAddress) payload.append('solvedAddress', solvedAddress);
          payload.append('solvedNotes', solvedNotes || 'Remediation completed and verified with camera snapshot and live GPS.');
        } else {
          payload = {
            status: 'COMPLETED',
            solvedImageUrl: solvedImageUrl,
            beforeImageUrl: beforeImageUrl || actionToComplete.beforeImageUrl || actionToComplete.reportId?.imageUrl || '',
            solvedLatitude: solvedLatitude || actionToComplete.reportId?.latitude || 8.7138,
            solvedLongitude: solvedLongitude || actionToComplete.reportId?.longitude || 77.7568,
            solvedGpsAccuracy: solvedGpsAccuracy || 10,
            solvedAddress: solvedAddress || actionToComplete.targetArea || 'Municipal Sector',
            solvedNotes: solvedNotes || 'Remediation completed and verified with camera snapshot and live GPS.',
          };
        }
        res = await api.updateAuthorityAction(actionToComplete._id, payload);
      }

      if (res?.success) {
        setShowCompleteModal(false);
        loadAdminData();
      }
    } catch (err) {
      alert(err.message || 'Failed to complete authority action.');
    } finally {
      setCompletingAction(false);
    }
  };

  // Counts for overview
  const citizenCount = users.filter((u) => u.role === 'citizen').length;
  const ngoCount = users.filter((u) => u.role === 'ngo').length;
  const authCount = users.filter((u) => u.role === 'authority').length;
  const driverCount = users.filter((u) => u.role === 'driver').length;

  const pendingActionsCount = actions.filter((a) => a.status === 'PENDING').length;
  const inProgressActionsCount = actions.filter((a) => a.status === 'IN_PROGRESS').length;
  const completedActionsCount = actions.filter((a) => a.status === 'COMPLETED').length;

  const unreadAdminNotifications = notifications.filter((n) => !n.read).length;

  const adminNav = [
    { key: 'overview', label: 'Platform Console', icon: Settings },
    { key: 'map', label: 'GIS Incident Map', icon: MapPin, badge: reports.length || null },
    { key: 'reports', label: 'Accident Reports', icon: Database, badge: reports.length || null },
    { key: 'causes', label: 'Cause Analytics', icon: BarChart3 },
    { key: 'actions', label: 'Authority Actions', icon: Wrench, badge: actions.length || null },
    { key: 'rescue', label: 'NGO Rescues', icon: HeartHandshake, badge: rescues.length || null },
    { key: 'hotspots', label: 'DBSCAN Clusters', icon: Sliders, badge: hotspots.length || null },
    { key: 'proofs', label: 'Resolution Proofs', icon: ShieldCheck, badge: completedActionsCount || null, badgeColor: '#10b981' },
    {
      key: 'notifications',
      label: 'Audit Alerts',
      icon: Bell,
      badge: activeSection === 'notifications' ? null : (unreadAdminNotifications > 0 ? unreadAdminNotifications : null),
      badgeColor: '#ef4444',
    },
  ];

  return (
    <RoleDashboardLayout
      role="admin"
      navItems={adminNav}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', fontWeight: 700, fontSize: '0.825rem', textTransform: 'uppercase' }}>
            <Settings size={18} /> PawAlert AI Platform Administration
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {activeSection === 'overview' && 'Platform Governance & Full-Lifecycle Audit Console'}
            {activeSection === 'map' && 'Central GIS Spatial Incident & Hotspot Mapping'}
            {activeSection === 'reports' && 'Global Accident Database & Lifecycle Audit'}
            {activeSection === 'causes' && 'Aggregated Citizen-Reported Accident Causes'}
            {activeSection === 'actions' && 'Authority Remediation Actions Registry'}
            {activeSection === 'rescue' && 'Cross-Platform Rescue Monitoring'}
            {activeSection === 'hotspots' && 'DBSCAN Spatial Cluster Records'}
            {activeSection === 'proofs' && 'Authority Resolution Proof Gallery'}
            {activeSection === 'notifications' && 'System-Wide Civic Audit & Platform Alerts'}
          </h1>
        </div>

        {/* ================= ADMIN 4-STAGE WORKFLOW PIPELINE ================= */}
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
              <Sparkles size={18} color="#fbbf24" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                System Administrator 4-Stage Governance Workflow
              </h3>
            </div>
            <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
              Full end-to-end case auditing & cross-role oversight
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {ADMIN_WORKFLOW_STEPS.map((ws) => {
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
                        background: '#d97706',
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
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fde68a' }}>
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
            {/* 6 Stat Cards (Section 22) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{completedActionsCount}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                    Resolution Proofs ({pendingActionsCount} Pending, {inProgressActionsCount} In Progress)
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#ccfbf1', color: '#0d9488' }}>
                  <Database size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f766e' }}>{reports.length}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Accident Reports</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{hotspots.length}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Active Hotspots</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                  <HeartHandshake size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7c3aed' }}>{rescues.length}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Rescue Requests</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                  <Wrench size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4338ca' }}>{actions.length}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                    Actions ({pendingActionsCount} P, {inProgressActionsCount} IP)
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{completedActionsCount}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Resolved with Proof</div>
                </div>
              </div>
            </div>

            {/* GIS Overview Map Card (Admin Spatial Operations) */}
            <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} color="#d97706" />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Central GIS Incident & Accident Hotspot Mapping
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Real-time GIS geospatial projection of all citizen reports, active rescue sites, and DBSCAN cluster zones
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge badge-teal">{reports.length} Incident Pins</span>
                  <span className="badge badge-danger">{hotspots.length} Active Hotspots</span>
                  <button
                    onClick={() => setActiveSection('map')}
                    className="btn btn-sm btn-primary"
                    style={{ background: '#d97706', borderColor: '#d97706', fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
                  >
                    Open Fullscreen GIS Map →
                  </button>
                </div>
              </div>

              <GisMap
                center={[8.7138, 77.7568]}
                zoom={13}
                reports={reports}
                hotspots={hotspots}
                height="380px"
              />
            </div>

            {/* Split: Recent Reports with Lifecycle Audit & DBSCAN Tuner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
              {/* Reports List with Audit Button */}
              <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={18} color="#d97706" /> Full Lifecycle Incident Audit
                  </h3>
                  <button onClick={() => setActiveSection('reports')} style={{ background: 'none', border: 'none', color: '#d97706', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    View All ({reports.length}) →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '360px', overflowY: 'auto' }}>
                  {reports.map((r) => (
                    <div key={r._id} style={{ padding: '0.75rem 0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                          {r.animalType} ({r.reportId})
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Status: <strong style={{ color: '#0f172a' }}>{r.status}</strong> • 📍 {r.address?.substring(0, 24)}...
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedAuditReport(r)}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '3px 8px', color: '#d97706' }}
                      >
                        <Eye size={12} /> Audit Case
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* DBSCAN Tuner */}
              <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sliders size={18} color="#d97706" /> DBSCAN Spatial Hyperparameters
                </h3>
                <form onSubmit={handleApplyDbscanParams} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                      Epsilon Radius (ε): <strong>{dbscanParams.epsilon} meters</strong>
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="1500"
                      step="50"
                      value={dbscanParams.epsilon}
                      onChange={(e) => setDbscanParams({ ...dbscanParams, epsilon: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: '#d97706' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                      Min Points (MinPts): <strong>{dbscanParams.minPts} accident reports</strong>
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="10"
                      value={dbscanParams.minPts}
                      onChange={(e) => setDbscanParams({ ...dbscanParams, minPts: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: '#d97706' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ background: '#d97706', marginTop: '0.5rem', fontWeight: 800 }}>
                    Apply & Recalculate Clusters
                  </button>
                  {tuningSuccess && <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>✓ Spatial clusters recalculated successfully!</span>}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: DEDICATED GIS MAP ================= */}
        {activeSection === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <MapPin size={22} color="#d97706" /> Central GIS Spatial Operations & Hotspot Map
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0 0' }}>
                    Visualizing all reported accidents, live GPS coordinates, high-risk accident clusters, and rescue locations.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: '#ecfdf5', color: '#047857', borderRadius: '8px', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Socket.IO Real-Time Stream Active
                  </div>
                  <span className="badge badge-teal">{reports.length} Total Reports</span>
                  <span className="badge badge-danger">{hotspots.length} DBSCAN Clusters</span>
                </div>
              </div>

              <GisMap
                center={[8.7138, 77.7568]}
                zoom={13}
                reports={reports}
                hotspots={hotspots}
                height="620px"
              />
            </div>
          </div>
        )}

        {/* ================= SECTION 2: REPORTS REGISTRY & AUDIT ================= */}
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

          const filteredAdminReports = reports
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

          const renderAdminReportCard = (r) => (
            <div
              key={r._id}
              style={{
                padding: '1.15rem',
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.925rem', color: '#0f172a' }}>
                    {getAnimalEmoji(r.animalType)} {r.reportId}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span>
                </div>

                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    alt="Animal"
                    style={{ width: '100%', height: '145px', objectFit: 'cover', borderRadius: '10px', margin: '6px 0' }}
                  />
                )}

                <div style={{ fontSize: '0.775rem', color: '#475569', margin: '4px 0', lineHeight: 1.4 }}>
                  {r.description}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748b', margin: '3px 0' }}>📍 {r.address}</div>

                {r.possibleCauses && r.possibleCauses.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b' }}>Reported Causes:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                      {r.possibleCauses.map((c, i) => (
                        <span key={i} style={{ background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.85rem' }}>
                <button
                  onClick={() => setSelectedAuditReport(r)}
                  className="btn btn-sm btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem' }}
                >
                  <Eye size={13} /> Case Audit
                </button>
                <button
                  onClick={() => handleOpenCompleteModal(r)}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#0d9488', borderColor: '#0d9488', width: '100%', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Camera size={13} /> Attach Proof
                </button>
              </div>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Global Incident Database ({reports.length} Records)
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Audit any report across the civic lifecycle organized strictly by active stage.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search incident reports..."
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
                          border: isSel ? '2px solid #d97706' : '1px solid #cbd5e1',
                          background: isSel ? '#d97706' : '#ffffff',
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

              {filteredAdminReports.length === 0 ? (
                <div className="card" style={{ padding: '3.5rem', textAlign: 'center', borderRadius: '16px' }}>
                  <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155' }}>No incident reports found in {reportFilter} stage.</h4>
                </div>
              ) : reportFilter === 'ALL' && !reportSearch ? (
                /* Grouped under respective stages when viewing ALL */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {REPORT_STAGE_CONFIGS.map((stage) => {
                    const stageReports = filteredAdminReports.filter((r) => getReportStage(r) === stage.key);
                    if (stageReports.length === 0) return null;
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
                                  {stageReports.length} {stageReports.length === 1 ? 'report' : 'reports'}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>{stage.desc}</p>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                          {stageReports.map((r) => renderAdminReportCard(r))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Filtered flat list */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                  {filteredAdminReports.map((r) => renderAdminReportCard(r))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= SECTION 3: CAUSE ANALYTICS ================= */}
        {activeSection === 'causes' && (() => {
          const distribution = causeAnalysis?.distribution || causeAnalysis?.causes || [];
          const totalAnalyzed = causeAnalysis?.totalReports || causeAnalysis?.totalAnalyzed || reports.length;
          const topCauseName = causeAnalysis?.topCause || (distribution.length > 0 ? (distribution[0].cause || distribution[0].name) : 'None');

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    📊 Aggregated Citizen-Reported Causes & Hazards
                  </h2>
                  <span className="badge badge-teal" style={{ fontSize: '0.75rem' }}>
                    {totalAnalyzed} INCIDENTS ANALYZED
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Real-time environmental risk factors computed directly from citizen accident reports and civic observations.
                </p>

                {distribution.length > 0 ? (
                  <>
                    {/* Top Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Primary Identified Cause</span>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>{topCauseName}</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Distinct Hazard Factors</span>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{distribution.length} Factor Categories</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Remediation Readiness</span>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>Active Feedback Loop</div>
                      </div>
                    </div>

                    {/* Recharts BarChart */}
                    <div style={{ height: 260, width: '100%', marginBottom: '1.5rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={distribution.map((d) => ({
                            name: d.cause || d.name,
                            percentage: d.percentage || 0,
                            count: d.count || 0,
                          }))}
                          margin={{ top: 10, right: 20, left: -10, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: '#475569' }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                          />
                          <YAxis unit="%" tick={{ fontSize: 11, fill: '#475569' }} />
                          <Tooltip
                            formatter={(value, name, item) => [`${value}% (${item.payload.count} reports)`, 'Share']}
                            contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '0.75rem' }}
                          />
                          <Bar dataKey="percentage" fill="#d97706" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Progress Card Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                      {distribution.map((c, i) => {
                        const causeTitle = c.cause || c.name || 'Environmental factor';
                        const pct = c.percentage || 0;
                        const count = c.count || 0;
                        return (
                          <div key={i} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, marginBottom: '6px' }}>
                              <span style={{ color: '#0f172a' }}>{causeTitle}</span>
                              <span style={{ color: '#d97706' }}>{pct}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#d97706', borderRadius: '4px' }} />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                              Reported in {count} {count === 1 ? 'incident' : 'incidents'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Informative Clean State when zero reports or causes exist */
                  <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <BarChart3 size={42} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                      Civic Cause Intelligence Engine Active
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '520px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                      No citizen accident reports with environmental cause tags have been submitted yet. As soon as citizens upload accident complaints through the Citizen Portal, this engine dynamically aggregates contributing factors:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', maxWidth: '600px', margin: '0 auto' }}>
                      {[
                        'Poor street lighting',
                        'High vehicle speed',
                        'Potholes / Road obstruction',
                        'Poor visibility / Weather',
                        'Garbage attracting animals',
                        'Heavy traffic corridors',
                      ].map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#475569',
                          }}
                        >
                          🏷️ {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ================= SECTION 4: ACTIONS ================= */}
        {activeSection === 'actions' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Authority Remediation Actions ({actions.length})
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Track municipal tasks and attach live camera snapshots or photo file uploads with verified GPS coordinates.
                </p>
              </div>
              {actions.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#0d9488', borderColor: '#0d9488', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => handleOpenCompleteModal(actions[0])}
                >
                  <Camera size={14} /> 📸 Attach Camera / File Proof
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {actions.map((act) => {
                const isDone = act.status === 'COMPLETED' || Boolean(act.solvedImageUrl);
                return (
                  <div
                    key={act._id}
                    style={{
                      padding: '1.25rem',
                      background: '#f8fafc',
                      borderRadius: '14px',
                      border: isDone ? '1px solid #86efac' : '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{act.actionType}</span>
                      <span className={`badge ${isDone ? 'badge-teal' : 'badge-warning'}`}>
                        {act.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                      <strong>Problem:</strong> {act.problem}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div>📍 <strong>Target Area:</strong> {act.targetArea || 'Municipal Sector'}</div>
                      <div>🏛️ <strong>Department:</strong> {act.assignedDepartment}</div>
                      {act.possibleCause && <div>⚠️ <strong>Cause:</strong> {act.possibleCause}</div>}
                    </div>

                    {isDone && (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', color: '#047857' }}>
                        ✓ <strong>Verified Resolution:</strong> Stamped with Live GPS Geotag
                      </div>
                    )}

                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenCompleteModal(act)}
                        className={`btn ${isDone ? 'btn-secondary' : 'btn-primary'}`}
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          background: isDone ? '#ffffff' : '#0d9488',
                          borderColor: isDone ? '#cbd5e1' : '#0d9488',
                          color: isDone ? '#0f172a' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Camera size={15} /> {isDone ? '📸 Update / Re-capture Proof' : '📸 Attach Camera / File Proof (with GPS)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= SECTION 5: RESCUES ================= */}
        {activeSection === 'rescue' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Platform Rescue Operations ({rescues.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {rescues.map((rec) => (
                <div key={rec._id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                      Rescue Case: {rec.reportId?.reportId || 'DISPATCH'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Assigned: {rec.assignedVolunteer || 'Squad 2'} • NGO: {rec.assignedNgo?.name || 'PawRescue NGO'}
                    </div>
                  </div>
                  <span className="badge badge-teal">{rec.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SECTION 6: HOTSPOTS ================= */}
        {activeSection === 'hotspots' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              DBSCAN Hotspots Registry ({hotspots.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {hotspots.map((h) => (
                <div key={h._id} style={{ padding: '1.1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="badge badge-danger">{h.riskLevel} RISK</span>
                    <span className="badge badge-gray">{h.reportCount} Incidents</span>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{h.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Radius: {h.radius}m • Top Cause: {h.mostFrequentCause || 'Poor lighting'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SECTION 7: PROOFS (Before & After Gallery with Live GPS) ================= */}
        {activeSection === 'proofs' && (() => {
          const proofActions = actions.filter((a) => a.solvedImageUrl && (a.status === 'COMPLETED' || a.solvedImageUrl.length > 5));
          return (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    🛡️ Authority Resolution Proof Archive (Before & After)
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                    Civic accountability gallery displaying live camera evidence and GPS geotagged coordinates for completed infrastructure remediation.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge badge-teal">
                    {proofActions.length} VERIFIED ACTIONS
                  </span>
                  {(actions.length > 0 || reports.length > 0) && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ background: '#0d9488', borderColor: '#0d9488', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => handleOpenCompleteModal(proofActions[0] || actions[0] || reports[0])}
                    >
                      <Camera size={14} /> 📸 Attach Resolution Proof
                    </button>
                  )}
                </div>
              </div>

              {proofActions.length === 0 ? (
                <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
                  <ShieldCheck size={38} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155' }}>No verified resolution proofs yet.</h4>
                  <p style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '440px', margin: '0.25rem auto 1.25rem' }}>
                    When authorities or admins remediate citizen-reported accident locations and attach Before & After photo proof with live GPS, verified records will be archived here.
                  </p>
                  {(reports.length > 0 || actions.length > 0) ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ background: '#0d9488', borderColor: '#0d9488', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                      onClick={() => handleOpenCompleteModal(actions[0] || reports[0])}
                    >
                      <Camera size={16} /> 📸 Attach Resolution Proof for a Report Now
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Citizen accident reports submitted via the portal will appear here for remediation.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                  {proofActions.map((act) => {
                    const beforeImg = act.beforeImageUrl || act.reportId?.imageUrl;
                    const afterImg = act.solvedImageUrl;
                    const lat = act.solvedLatitude || act.reportId?.latitude;
                    const lng = act.solvedLongitude || act.reportId?.longitude;
                    const acc = act.solvedGpsAccuracy;
                    const addr = act.solvedAddress || act.targetArea || act.reportId?.address || 'Municipal road sector';

                    return (
                      <div
                        key={act._id}
                        style={{
                          background: '#f8fafc',
                          padding: '1.25rem',
                          borderRadius: '14px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{act.actionType}</strong>
                            <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                              Dept: {act.assignedDepartment} {act.reportId?.reportId ? `• Case: ${act.reportId.reportId}` : ''}
                            </div>
                          </div>
                          <span className="badge badge-teal" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={13} /> VERIFIED PROOF
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                          <strong>Problem:</strong> {act.problem}
                        </div>

                        {/* Side-by-side Before and After Photos */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={13} /> BEFORE (Hazard)
                            </div>
                            {beforeImg ? (
                              <img
                                src={beforeImg}
                                alt="Before Proof"
                                style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }}
                              />
                            ) : (
                              <div style={{ height: '140px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#94a3b8', fontSize: '0.75rem', gap: '4px', border: '1px dashed #cbd5e1' }}>
                                <AlertTriangle size={18} color="#f87171" />
                                <span>No original hazard photo</span>
                              </div>
                            )}
                          </div>

                          <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={13} /> AFTER (Solved Camera)
                            </div>
                            {afterImg ? (
                              <img
                                src={afterImg}
                                alt="After Solved Proof"
                                style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }}
                              />
                            ) : (
                              <div style={{ height: '140px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#94a3b8', fontSize: '0.75rem', gap: '4px', border: '1px dashed #cbd5e1' }}>
                                <Camera size={18} color="#10b981" />
                                <span>Proof Pending</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Live GPS Geotag info */}
                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#047857' }}>
                            <MapPin size={14} />
                            <span>
                              {lat && lng ? `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} ${acc ? `(±${acc}m accuracy)` : ''}` : 'GPS Tagged On-Site'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#065f46', marginTop: '2px' }}>
                            📍 {addr}
                          </div>
                        </div>

                        {act.solvedNotes && (
                          <div style={{ fontSize: '0.775rem', color: '#475569', fontStyle: 'italic', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            "{act.solvedNotes}"
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}
                            onClick={() => handleOpenCompleteModal(act)}
                          >
                            <Camera size={13} /> 📸 Update / Re-capture Proof
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= SECTION: AUDIT NOTIFICATIONS ================= */}
        {activeSection === 'notifications' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Platform Audit & Civic Alerts ({notifications.length})
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '4px 0 0 0' }}>
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

            {notifications.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                <Bell size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155' }}>No system alerts recorded.</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  Live incident streams and lifecycle changes will broadcast here automatically.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {notifications.map((n) => {
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
                        borderLeft: `5px solid ${n.type === 'danger' || n.priority === 'Critical' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#0d9488'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        boxShadow: isRead ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                        transition: 'all 0.15s ease',
                        opacity: isRead ? 0.75 : 1,
                      }}
                      title="Click to mark as read"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.925rem', color: '#0f172a' }}>
                            {n.title}
                          </span>
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
                        <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.825rem', color: '#475569', margin: 0 }}>
                        {n.message}
                      </p>
                      {n.relatedReportId && (
                        <div style={{ fontSize: '0.725rem', color: '#0d9488', fontWeight: 600, marginTop: '2px' }}>
                          📋 Related Report: {n.relatedReportId.reportId || n.relatedReportId._id} ({n.relatedReportId.animalType})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= COMPLETE LIFECYCLE CASE AUDIT MODAL (Section 23) ================= */}
        {selectedAuditReport && (
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
            onClick={() => setSelectedAuditReport(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                maxWidth: '720px',
                width: '100%',
                padding: '1.75rem',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>
                    Complete Lifecycle Case Audit
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Case: {selectedAuditReport.reportId} ({selectedAuditReport.animalType})
                  </h3>
                </div>
                <span className="badge badge-teal">{selectedAuditReport.status}</span>
              </div>

              {/* Complete Lifecycle Flow (Section 23) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* 1. Citizen & AI */}
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', marginBottom: '2px' }}>
                    1. CITIZEN SUBMISSION & AI DETECTION
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#0f172a' }}>
                    Species: <strong>{selectedAuditReport.animalType}</strong> • AI Confidence: <strong>{Math.round((selectedAuditReport.aiConfidence || 0.95) * 100)}%</strong>
                    {selectedAuditReport.aiCorrected && ' (Confirmed/Corrected by Citizen)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    📍 Location: {selectedAuditReport.address} ({selectedAuditReport.latitude?.toFixed(4)}, {selectedAuditReport.longitude?.toFixed(4)})
                  </div>
                </div>

                {/* 2. Citizen's Possible Causes */}
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7c3aed', marginBottom: '2px' }}>
                    2. CITIZEN'S SUSPECTED CAUSES & OBSERVATIONS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                    {selectedAuditReport.possibleCauses && selectedAuditReport.possibleCauses.length > 0 ? (
                      selectedAuditReport.possibleCauses.map((c, i) => (
                        <span key={i} style={{ background: '#f3e8ff', color: '#7c3aed', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                          {c}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>None specified</span>
                    )}
                  </div>
                  {selectedAuditReport.citizenObservation && (
                    <p style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', margin: '2px 0 0' }}>
                      "{selectedAuditReport.citizenObservation}"
                    </p>
                  )}
                </div>

                {/* 3. Database Record & Hotspot */}
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0d9488', marginBottom: '2px' }}>
                    3. MONGODB RECORD & DBSCAN SPATIAL CLUSTERING
                  </div>
                  <div style={{ fontSize: '0.775rem', color: '#334155' }}>
                    Record ID: <code>{selectedAuditReport._id}</code> • Registered: {new Date(selectedAuditReport.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* 4. NGO Rescue */}
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', marginBottom: '2px' }}>
                    4. NGO RESCUE ACTIVITY
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                    Rescue Status: <strong>{selectedAuditReport.status}</strong>
                  </div>
                </div>

                {/* 5. Authority Remediation & Solved Photo */}
                <div style={{ background: '#f0fdf4', padding: '0.85rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', marginBottom: '2px' }}>
                    5. AUTHORITY REMEDIATION & RESOLUTION PROOF
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d', marginBottom: '4px' }}>
                    Remediation Status: <strong>{selectedAuditReport.remediationStatus || 'PENDING'}</strong>
                  </div>
                  {selectedAuditReport.remediationActionId?.solvedImageUrl ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#ef4444' }}>Before (Incident):</span>
                        {selectedAuditReport.imageUrl ? (
                          <img src={selectedAuditReport.imageUrl} alt="Before" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }} />
                        ) : (
                          <div style={{ height: '110px', background: '#ffffff', borderRadius: '6px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.7rem' }}>No photo</div>
                        )}
                      </div>
                      <div>
                        <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#16a34a' }}>After (Solved Proof):</span>
                        <img src={selectedAuditReport.remediationActionId.solvedImageUrl} alt="After" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px dashed #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>No resolution photo proof attached yet.</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: '0.7rem', background: '#0d9488', borderColor: '#0d9488', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          const target = selectedAuditReport;
                          setSelectedAuditReport(null);
                          handleOpenCompleteModal(target);
                        }}
                      >
                        <Camera size={12} /> Attach Proof Now
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button onClick={() => setSelectedAuditReport(null)} className="btn btn-secondary">
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= ATTACH RESOLUTION PROOF MODAL (Before & After with Live GPS) ================= */}
        {showCompleteModal && actionToComplete && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
            }}
            onClick={() => setShowCompleteModal(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '94vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={22} /> Attach Resolution Proof (Camera / File + GPS)
                  </h3>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '2px' }}>
                    Civic remediation verification: Geotagged Before & After proof for auditing
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCompleteActionSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Action summary badge & selector */}
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{actionToComplete.actionType}</span>
                    <span className="badge badge-teal">{actionToComplete.status}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    <strong>Problem:</strong> {actionToComplete.problem}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Sector: <strong>{actionToComplete.targetArea || 'Municipal Sector'}</strong> • Dept: {actionToComplete.assignedDepartment}
                  </div>

                  {/* Target selector: citizen reports or actions */}
                  {(reports.length > 0 || actions.length > 0) && (
                    <div style={{ marginTop: '4px' }}>
                      <label style={{ fontSize: '0.725rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                        Select Reported Incident or Action:
                      </label>
                      <select
                        value={actionToComplete._id || (actionToComplete.reportId?._id || actionToComplete.reportId) || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matchReport = reports.find((r) => r._id === val);
                          if (matchReport) {
                            handleOpenCompleteModal(matchReport);
                            return;
                          }
                          const matchAction = actions.find((a) => a._id === val);
                          if (matchAction) {
                            handleOpenCompleteModal(matchAction);
                          }
                        }}
                        style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', marginTop: '2px', background: '#ffffff' }}
                      >
                        {reports.length > 0 && (
                          <optgroup label="Citizen Accident Reports">
                            {reports.map((r) => (
                              <option key={r._id} value={r._id}>
                                {getAnimalEmoji(r.animalType)} {r.reportId} — {r.address} ({r.status})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {actions.length > 0 && (
                          <optgroup label="Authority Remediation Actions">
                            {actions.map((a) => (
                              <option key={a._id} value={a._id}>
                                🛠️ {a.actionType} — {a.targetArea || 'Municipal Sector'} ({a.status})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* 1. BEFORE PHOTO PROOF */}
                <div style={{ background: '#fff5f5', padding: '1rem', borderRadius: '12px', border: '1px solid #fecaca' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={16} /> 1. BEFORE PHOTO (Citizen Incident / Hazard)
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenCapture('before')}
                      className="btn btn-sm btn-primary"
                      style={{ background: '#dc2626', borderColor: '#dc2626', fontSize: '0.725rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Camera size={13} /> 📸 Live Camera with GPS
                    </button>
                  </div>

                  {beforeImageUrl ? (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <img
                        src={beforeImageUrl}
                        alt="Before Preview"
                        style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #f87171' }}
                      />
                      <div style={{ fontSize: '0.75rem', color: '#991b1b', flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>✓ Incident Photo Attached from Citizen Report</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>Serves as the verifiable baseline for civic remediation.</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', marginBottom: '0.5rem' }}>
                      Capture hazard with camera above, or upload file below:
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBeforeImageUpload}
                      style={{ flex: 1, fontSize: '0.75rem' }}
                    />
                  </div>
                </div>

                {/* 2. AFTER RESOLUTION PHOTO PROOF */}
                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={16} /> 2. AFTER PHOTO (Resolution Solved Proof) *
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenCapture('after')}
                      className="btn btn-sm btn-primary"
                      style={{ background: '#16a34a', borderColor: '#16a34a', fontSize: '0.725rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Camera size={13} /> 📸 Live Camera with GPS
                    </button>
                  </div>

                  {solvedImageUrl ? (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <img
                        src={solvedImageUrl}
                        alt="Solved Preview"
                        style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #86efac' }}
                      />
                      <div style={{ fontSize: '0.75rem', color: '#166534', flex: 1 }}>
                        <div style={{ fontWeight: 800 }}>✓ Solved Proof Captured & Ready!</div>
                        {solvedLatitude && solvedLongitude && (
                          <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '2px' }}>
                            📍 GPS: {Number(solvedLatitude).toFixed(5)}, {Number(solvedLongitude).toFixed(5)} (±{solvedGpsAccuracy || 10}m)
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.5rem' }}>
                      Capture on-site with live camera above, or upload photo file from device:
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSolvedImageUpload}
                    style={{ width: '100%', fontSize: '0.75rem' }}
                  />
                </div>

                {/* 3. LIVE GPS GEOTAG STATUS */}
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={15} color="#0d9488" /> 3. Verification GPS Coordinates & Geotag:
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchCurrentGps}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      <RefreshCw size={11} /> Refresh Live GPS
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Latitude:</label>
                      <input
                        type="number"
                        step="any"
                        value={solvedLatitude || ''}
                        onChange={(e) => setSolvedLatitude(parseFloat(e.target.value))}
                        placeholder="8.7138"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Longitude:</label>
                      <input
                        type="number"
                        step="any"
                        value={solvedLongitude || ''}
                        onChange={(e) => setSolvedLongitude(parseFloat(e.target.value))}
                        placeholder="77.7568"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                      Geotagged Landmark / Municipal Address:
                    </label>
                    <input
                      type="text"
                      value={solvedAddress}
                      onChange={(e) => setSolvedAddress(e.target.value)}
                      placeholder="e.g. South Bypass Highway, North Curve"
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                {/* 4. Solved Notes */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Remediation Notes & Civic Audit Summary:
                  </label>
                  <textarea
                    rows={2}
                    value={solvedNotes}
                    onChange={(e) => setSolvedNotes(e.target.value)}
                    placeholder="e.g. Completed LED solar illumination retrofit and hazard clearance on-site."
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem' }}
                  />
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button type="button" onClick={() => setShowCompleteModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!solvedImageUrl && !solvedImageFile}
                    className="btn btn-primary"
                    style={{
                      background: '#10b981',
                      borderColor: '#10b981',
                      fontWeight: 800,
                      opacity: !solvedImageUrl && !solvedImageFile ? 0.5 : 1,
                      cursor: !solvedImageUrl && !solvedImageFile ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Check size={16} /> {completingAction ? 'Uploading Proof...' : '✓ Confirm & Upload Solved Proof'}
                  </button>
                </div>
              </form>
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
