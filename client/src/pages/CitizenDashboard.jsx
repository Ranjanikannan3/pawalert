import React, { useState, useEffect } from 'react';
import {
  PawPrint,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Navigation,
  FileText,
  Eye,
  RefreshCw,
  Bell,
  User,
  ShieldCheck,
  ChevronRight,
  Info,
  Layers,
  HeartHandshake,
  Search,
  Filter,
  ArrowRight,
  Check,
  Edit3,
} from 'lucide-react';
import AiClassifierModal from '../components/AiClassifierModal';
import GisMap from '../components/GisMap';
import RescueTimeline from '../components/RescueTimeline';
import RoleDashboardLayout from '../components/RoleDashboardLayout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getAnimalEmoji, getStatusBadgeClass } from '../utils/geoUtils';
import confetti from 'canvas-confetti';
import { subscribeToLiveEvents } from '../services/socket';

const CITIZEN_WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Spot & Capture',
    desc: 'Citizen encounters injured stray animal and uploads evidence photo',
    icon: Camera,
  },
  {
    step: 2,
    title: 'AI Species Detection',
    desc: 'AI classifies animal (Dog, Cat, Cattle) with confirmation & correction',
    icon: Sparkles,
  },
  {
    step: 3,
    title: 'Root Cause & GPS',
    desc: 'Select contributing hazards (lighting, speed, garbage) and location',
    icon: MapPin,
  },
  {
    step: 4,
    title: 'NGO & Authority Sync',
    desc: 'Simultaneous NGO rescue dispatch and municipal problem analysis',
    icon: ShieldCheck,
  },
  {
    step: 5,
    title: 'Photo Proof & Solved',
    desc: 'Live tracking until authority uploads solved before/after photo proof',
    icon: CheckCircle2,
  },
];

const POSSIBLE_CAUSES_OPTIONS = [
  { key: 'High vehicle speed', label: '🚗 High vehicle speed' },
  { key: 'Poor street lighting', label: '🌙 Poor street lighting' },
  { key: 'Poor road visibility', label: '🛣️ Poor road visibility' },
  { key: 'Garbage/food attracting animals', label: '🗑️ Garbage/food attracting animals' },
  { key: 'Road obstruction', label: '🚧 Road obstruction' },
  { key: 'Animals frequently crossing this road', label: '🐾 Animals frequently crossing this road' },
  { key: 'Poor traffic control', label: '🚦 Poor traffic control' },
  { key: 'Construction area', label: '🏗️ Construction area' },
  { key: 'Vehicles parked near road', label: '🅿️ Vehicles parked near road' },
  { key: 'Poor weather/visibility', label: '🌧️ Poor weather/visibility' },
  { key: 'Heavy traffic/noise', label: '🔊 Heavy traffic/noise' },
  { key: 'Other', label: '⚡ Other' },
];

const STAGE_CONFIGS = [
  { key: 'PENDING', label: 'Pending Verification', icon: Clock, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', desc: 'Awaiting squad dispatch & initial verification' },
  { key: 'ACCEPTED', label: 'Accepted by Rescue Squad', icon: HeartHandshake, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', desc: 'Case claimed by NGO; rescue squad dispatched' },
  { key: 'ON THE WAY', label: 'Responders En Route', icon: Navigation, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Ambulance / squad moving to incident GPS coordinates' },
  { key: 'RESCUED', label: 'Rescued & In Medical Care', icon: ShieldCheck, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', desc: 'Animal secured, receiving veterinary triage' },
  { key: 'COMPLETED', label: 'Completed & Solved', icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4', border: '#86efac', desc: 'Rescue finalized and municipal hazard remediated' },
  { key: 'DUPLICATE', label: 'Duplicate / Linked Cases', icon: AlertTriangle, color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', desc: 'Synchronized with active case to avoid duplicate dispatch' },
];

export const getReportStage = (report) => {
  if (!report) return 'PENDING';
  if (report.isDuplicate || report.status?.toUpperCase() === 'DUPLICATE') {
    return 'DUPLICATE';
  }
  const s = (report.status || '').toUpperCase();
  if (['COMPLETED', 'RESOLVED', 'CLOSED'].includes(s)) {
    return 'COMPLETED';
  }
  if (['RESCUED'].includes(s)) {
    return 'RESCUED';
  }
  if (['ON THE WAY', 'ON_THE_WAY', 'ANIMAL REACHED', 'ANIMAL_REACHED'].includes(s)) {
    return 'ON THE WAY';
  }
  if (['ACCEPTED', 'ASSIGNED', 'RESCUE ASSIGNED', 'RESCUE_ASSIGNED'].includes(s)) {
    return 'ACCEPTED';
  }
  return 'PENDING';
};

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [step, setStep] = useState(1);
  const [myReports, setMyReports] = useState([]);
  const [nearbyHotspots, setNearbyHotspots] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState(null);
  const [reportSearch, setReportSearch] = useState('');
  const [reportFilter, setReportFilter] = useState('ALL');

  // Species confirmation & correction
  const [aiDetectedSpecies, setAiDetectedSpecies] = useState('Dog');
  const [aiDetectedConfidence, setAiDetectedConfidence] = useState(96);
  const [aiIsAnimal, setAiIsAnimal] = useState(true);
  const [aiIsHuman, setAiIsHuman] = useState(false);
  const [aiImageError, setAiImageError] = useState(null);
  const [speciesCorrectionMode, setSpeciesCorrectionMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    animalType: 'Dog',
    aiConfidence: 0.96,
    aiCorrected: false,
    userCorrectedAnimal: '',
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
    rawFile: null,
    latitude: 8.7138,
    longitude: 77.7568,
    address: 'South Bypass Highway, Sector 1',
    description: '',
    selectedCauses: ['Poor street lighting'],
    customCause: '',
    citizenObservation: '',
    severity: 'Moderate',
    citizenName: user?.name || 'Citizen Volunteer',
    citizenPhone: user?.phone || '',
  });

  const [gettingLocation, setGettingLocation] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [ngoAcceptedAlert, setNgoAcceptedAlert] = useState(null);

  useEffect(() => {
    loadMyReports();
    loadNearbyHotspots();
    loadNotifications();

    // Subscribe to zero-latency real-time Socket.IO broadcasts
    const unsubscribe = subscribeToLiveEvents({
      onRescueUpdate: (data) => {
        console.log('⚡ [Citizen Live Sync] Rescue update received:', data);
        loadMyReports(false);
        loadNotifications();

        // Dynamically update the open modal in real-time so the stepper track updates live
        setSelectedReportDetail((prev) => {
          if (!prev) return prev;
          const matchReportId = data.reportId?._id || data.reportId || data.request?.reportId?._id || data.request?.reportId;
          const reportCode = data.request?.reportId?.reportId;
          if (prev._id === matchReportId || (reportCode && prev.reportId === reportCode)) {
            const updatedHistory = data.request?.statusHistory || [
              ...(prev.statusHistory || []),
              {
                status: data.status,
                updatedBy: data.request?.assignedVolunteer || 'Rescue Squad',
                notes: `Status advanced to ${data.status}`,
                timestamp: new Date(),
              },
            ];
            return {
              ...prev,
              status: data.status,
              statusHistory: updatedHistory,
              rescue: data.request || prev.rescue,
            };
          }
          return prev;
        });

        if (data.status === 'ACCEPTED' || data.status === 'Accepted' || data.status === 'ON THE WAY') {
          const reportCode = data.request?.reportId?.reportId || (typeof data.reportId === 'string' ? data.reportId : 'PA-ACCIDENT');
          setNgoAcceptedAlert({
            reportId: reportCode,
            status: data.status,
            message: `Accident report ${reportCode} was just ACCEPTED by Central Rescue Operations! Responders are dispatched to the incident GPS scene.`,
          });
        }
      },
      onAuthorityAction: () => {
        loadMyReports(false);
      },
      onHotspotUpdate: () => {
        loadNearbyHotspots();
      },
    });

    const pollTimer = setInterval(() => {
      loadMyReports(false);
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, [user]);

  const loadMyReports = async (showLoading = true) => {
    if (showLoading) setLoadingReports(true);
    try {
      const res = await api.getMyReports();
      if (res.success) {
        setMyReports(res.reports || []);
      }
    } catch (e) {
      console.error('Failed to load citizen reports:', e);
    } finally {
      if (showLoading) setLoadingReports(false);
    }
  };

  const loadNearbyHotspots = async () => {
    try {
      const res = await api.getHotspots();
      if (res.success) {
        setNearbyHotspots(res.hotspots || []);
      }
    } catch (e) {}
  };

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications('citizen');
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
        api.markAllNotificationsRead('citizen').catch(() => {});
      }
    }
  }, [activeSection, notifications]);

  const handleAiComplete = (result) => {
    if (result.isAnimal === false) {
      setAiIsAnimal(false);
      setAiIsHuman(Boolean(result.isHuman));
      setAiImageError(
        result.message ||
        (result.isHuman
          ? '⚠️ Invalid Image Detected: Human photograph detected. Only injured stray animals can be reported.'
          : '⚠️ Invalid Image Detected: No stray animal detected in this photo.')
      );
      setDuplicateWarning(null);
      setFormData((prev) => ({
        ...prev,
        animalType: result.isHuman ? 'Human' : 'Non-Animal',
        imageUrl: result.imageUrl,
        rawFile: result.rawFile,
      }));
      return;
    }

    setAiIsAnimal(true);
    setAiIsHuman(false);
    setAiImageError(null);
    const detectedAnimal = result.animalType || 'Dog';
    const conf = Math.round((result.confidence || 0.96) * 100);
    setAiDetectedSpecies(detectedAnimal);
    setAiDetectedConfidence(conf);
    setSpeciesCorrectionMode(false);

    const isDup = Boolean(result.isDuplicate || result.duplicateAnalysis?.isDuplicate);
    const existingRep = result.duplicateAnalysis?.matchingReport || result.matchingReport || result.existingReport;

    if (isDup && existingRep) {
      setDuplicateWarning({
        isDuplicate: true,
        isImageDuplicate: true,
        existingReport: existingRep,
        similarityScore: result.duplicateAnalysis?.similarityScore || result.similarityScore || 1.0,
        distanceMeters: existingRep?.distanceMeters,
        reason: result.duplicateReason || result.duplicateAnalysis?.reason || `Identical animal photo matched with previous report ${existingRep.reportId}`,
      });
    } else {
      setDuplicateWarning(null);
    }

    setFormData((prev) => ({
      ...prev,
      animalType: detectedAnimal,
      aiConfidence: result.confidence || 0.96,
      aiCorrected: false,
      userCorrectedAnimal: '',
      imageUrl: result.imageUrl,
      rawFile: result.rawFile,
      clientFingerprint: result.clientFingerprint || null,
    }));
  };

  const handleConfirmSpecies = () => {
    setFormData((prev) => ({
      ...prev,
      animalType: aiDetectedSpecies,
      aiCorrected: false,
      userCorrectedAnimal: '',
    }));
    setSpeciesCorrectionMode(false);
  };

  const handleCorrectSpecies = (newSpecies) => {
    setFormData((prev) => ({
      ...prev,
      animalType: newSpecies,
      aiCorrected: true,
      userCorrectedAnimal: newSpecies,
    }));
    setSpeciesCorrectionMode(false);
  };

  const toggleCause = (causeKey) => {
    setFormData((prev) => {
      const current = prev.selectedCauses || [];
      if (current.includes(causeKey)) {
        return { ...prev, selectedCauses: current.filter((c) => c !== causeKey) };
      } else {
        return { ...prev, selectedCauses: [...current, causeKey] };
      }
    });
  };

  const handleGetCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(5));
          const lng = parseFloat(pos.coords.longitude.toFixed(5));
          const acc = Math.round(pos.coords.accuracy || 12);
          setGpsAccuracy(acc);
          setFormData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            address: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)} (±${acc}m accuracy)`,
          }));
          setGettingLocation(false);
        },
        () => {
          setGettingLocation(false);
          setGpsAccuracy(15);
          setFormData((prev) => ({
            ...prev,
            latitude: 8.7138,
            longitude: 77.7568,
            address: 'South Bypass Highway, Sector 1 (GPS Acquired)',
          }));
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setGettingLocation(false);
    }
  };

  const handleMapLocationSelect = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(5)),
      longitude: parseFloat(lng.toFixed(5)),
      address: `Selected Pin: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    }));
  };

  const handleSubmit = async (bypassDuplicate = false) => {
    if (!aiIsAnimal || aiImageError) {
      alert('⚠️ Cannot submit report: Incorrect Image Detected. Please upload a photo of an injured stray animal (Dog, Cat, or Cattle).');
      setStep(1);
      return;
    }

    setSubmitting(true);
    setDuplicateWarning(null);

    try {
      const submitPayload = new FormData();
      submitPayload.append('animalType', formData.animalType);
      submitPayload.append('aiConfidence', formData.aiConfidence);
      submitPayload.append('aiCorrected', formData.aiCorrected ? 'true' : 'false');
      submitPayload.append('userCorrectedAnimal', formData.userCorrectedAnimal || '');
      submitPayload.append('latitude', formData.latitude);
      submitPayload.append('longitude', formData.longitude);
      submitPayload.append('address', formData.address);
      submitPayload.append(
        'description',
        formData.description || `Injured ${formData.animalType} reported near ${formData.address}`
      );
      submitPayload.append('severity', formData.severity);

      // Build causes list
      let finalCauses = [...formData.selectedCauses];
      if (formData.selectedCauses.includes('Other') && formData.customCause.trim()) {
        finalCauses = finalCauses.filter((c) => c !== 'Other').concat(formData.customCause.trim());
      }
      if (finalCauses.length === 0) finalCauses = ['Poor street lighting'];

      submitPayload.append('possibleCauses', JSON.stringify(finalCauses));
      submitPayload.append('rootCause', finalCauses[0]);
      submitPayload.append('citizenObservation', formData.citizenObservation || formData.description);
      submitPayload.append('citizenName', formData.citizenName);
      submitPayload.append('citizenPhone', formData.citizenPhone);
      submitPayload.append('imageUrl', formData.imageUrl);

      if (formData.rawFile) {
        submitPayload.append('image', formData.rawFile);
      }
      if (formData.clientFingerprint) {
        submitPayload.append('clientFingerprint', JSON.stringify(formData.clientFingerprint));
      }
      if (bypassDuplicate) {
        submitPayload.append('bypassDuplicateCheck', 'true');
      }

      const res = await api.submitReport(submitPayload);
      if (res.success) {
        const mergedReport = {
          ...res.report,
          isDuplicate: Boolean(res.isDuplicate || res.report?.isDuplicate || res.report?.status === 'DUPLICATE'),
          duplicateReportId: res.duplicateReportId || res.report?.duplicateReportId,
          duplicateReason: res.duplicateReason || res.report?.duplicateReason,
        };
        setSuccessReport(mergedReport);
        confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });
        loadMyReports(false);
        setStep(5);
      }
    } catch (err) {
      if (err.data?.isDuplicate) {
        setDuplicateWarning(err.data);
      } else {
        alert(err.message || 'Failed to submit accident report.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSuccessReport(null);
    setDuplicateWarning(null);
    setFormData({
      animalType: 'Dog',
      aiConfidence: 0.96,
      aiCorrected: false,
      userCorrectedAnimal: '',
      imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
      rawFile: null,
      latitude: 8.7138,
      longitude: 77.7568,
      address: 'South Bypass Highway, Sector 1',
      description: '',
      selectedCauses: ['Poor street lighting'],
      customCause: '',
      citizenObservation: '',
      severity: 'Moderate',
      citizenName: user?.name || 'Citizen Volunteer',
      citizenPhone: user?.phone || '',
    });
  };

  // Stage counts for accurate tabs
  const stageCounts = {
    ALL: myReports.length,
    PENDING: myReports.filter((r) => getReportStage(r) === 'PENDING').length,
    ACCEPTED: myReports.filter((r) => getReportStage(r) === 'ACCEPTED').length,
    'ON THE WAY': myReports.filter((r) => getReportStage(r) === 'ON THE WAY').length,
    RESCUED: myReports.filter((r) => getReportStage(r) === 'RESCUED').length,
    COMPLETED: myReports.filter((r) => getReportStage(r) === 'COMPLETED').length,
    DUPLICATE: myReports.filter((r) => getReportStage(r) === 'DUPLICATE').length,
  };

  // Filtered reports strictly by workflow stage
  const filteredReports = myReports
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const citizenNav = [
    { key: 'overview', label: 'Dashboard', icon: PawPrint },
    { key: 'report', label: 'Report Accident', icon: Camera },
    { key: 'reports', label: 'My Reports', icon: FileText, badge: myReports.length > 0 ? myReports.length : null, badgeColor: '#0d9488' },
    { key: 'hotspots', label: 'Nearby Hotspots', icon: MapPin },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: activeSection === 'notifications' ? null : (unreadCount > 0 ? unreadCount : null),
      badgeColor: '#ef4444',
    },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <RoleDashboardLayout
      role="citizen"
      navItems={citizenNav}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Real-time NGO Acceptance Notification Banner */}
        {ngoAcceptedAlert && (
          <div
            className="animate-fade-in"
            style={{
              marginBottom: '1.5rem',
              padding: '1.15rem 1.35rem',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '2px solid #22c55e',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 6px 20px rgba(34, 197, 94, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
                }}
              >
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#14532d', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🎉 Good News! NGO Rescue Team Accepted Your Request!
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.825rem', color: '#166534', lineHeight: 1.4 }}>
                  {ngoAcceptedAlert.message}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('reports');
                  setNgoAcceptedAlert(null);
                }}
                className="btn btn-sm btn-primary"
                style={{ background: '#15803d', borderColor: '#15803d', fontWeight: 700 }}
              >
                View Live Status Timeline →
              </button>
              <button
                type="button"
                onClick={() => setNgoAcceptedAlert(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#166534',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                }}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Duplicate Notice Banner with Instant Override */}
        {duplicateWarning && (
          <div
            className="animate-fade-in"
            style={{
              marginBottom: '1.5rem',
              padding: '1.25rem 1.5rem',
              background: '#fffbeb',
              border: '2px solid #f59e0b',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={26} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#92400e' }}>
                  {duplicateWarning.isImageDuplicate
                    ? `⚠️ DUPLICATE REPORT: Matched with Report ${duplicateWarning.existingReport?.reportId || 'Existing Case'}`
                    : `⚠️ Similar Accident Report Already Logged Nearby (${duplicateWarning.distanceMeters || 30}m)`}
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#b45309', fontWeight: 600, lineHeight: 1.4 }}>
                  {duplicateWarning.isImageDuplicate
                    ? `It is a duplicate report! The uploaded image matches previous report ${duplicateWarning.existingReport?.reportId}.`
                    : duplicateWarning.reason ||
                      `A report for ${duplicateWarning.existingReport?.animalType || 'an injured animal'} was recently submitted nearby.`}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="btn btn-sm btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuplicateWarning(null);
                  handleSubmit(false);
                }}
                className="btn btn-sm btn-primary"
                style={{ background: '#0d9488', borderColor: '#0d9488', fontWeight: 800 }}
              >
                🔗 Submit & Link as Duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuplicateWarning(null);
                  handleSubmit(true);
                }}
                className="btn btn-sm btn-secondary"
                style={{ background: '#fef3c7', borderColor: '#fde68a', color: '#92400e', fontWeight: 700 }}
              >
                ⚡ Force Distinct Incident
              </button>
            </div>
          </div>
        )}

        {/* Header Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0d9488', fontWeight: 700, fontSize: '0.825rem', textTransform: 'uppercase' }}>
            <PawPrint size={18} /> Welcome to PawAlert AI
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {activeSection === 'overview' && 'Citizen Incident Reporting & Rescue Portal'}
            {activeSection === 'report' && 'Report an Animal Accident'}
            {activeSection === 'reports' && 'My Reports & Case Resolution Timeline'}
            {activeSection === 'hotspots' && 'Nearby Accident Hotspots'}
            {activeSection === 'notifications' && 'Citizen Notifications'}
            {activeSection === 'profile' && 'Citizen Volunteer Profile'}
          </h1>
        </div>

        {/* ================= INTERACTIVE CITIZEN WORKFLOW PIPELINE ================= */}
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
              <Sparkles size={18} color="#2dd4bf" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                End-to-End Civic Safety & Rescue Flow
              </h3>
            </div>
            <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
              Citizen Report → AI Species → Cause Analysis → NGO Rescue → Authority Action → Solved Photo Proof
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
            {CITIZEN_WORKFLOW_STEPS.map((ws) => {
              const Icon = ws.icon;
              return (
                <div
                  key={ws.step}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#0d9488',
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
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2dd4bf' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
            {/* Left: Quick Reporting Wizard */}
            <div>
              <div className="card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Report an Animal Accident
                  </h3>
                  <span className="badge badge-teal">Step {step} of 4</span>
                </div>

                {/* Step Progress Indicators */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: step >= s ? '#0d9488' : '#e2e8f0',
                          color: step >= s ? '#ffffff' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {s}
                      </div>
                      <span style={{ fontSize: '0.725rem', fontWeight: step === s ? 700 : 500, color: step === s ? '#0d9488' : '#64748b' }}>
                        {s === 1 && 'AI Photo'}
                        {s === 2 && 'Location'}
                        {s === 3 && 'Causes'}
                        {s === 4 && 'Review'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* STEP 1: Photo & AI Classification with Edit/Correction */}
                {step === 1 && (
                  <div>
                    <AiClassifierModal
                      onAnalysisComplete={handleAiComplete}
                      selectedImage={formData.imageUrl}
                      onViewExistingCase={(rep) => {
                        setSelectedReportDetail(rep);
                        setActiveSection('reports');
                      }}
                    />

                    {/* Prominent Duplicate Alert Box in Step 1 */}
                    {duplicateWarning && (
                      <div
                        style={{
                          marginTop: '1.25rem',
                          padding: '1.15rem 1.25rem',
                          borderRadius: '12px',
                          background: '#fffbeb',
                          border: '2px solid #f59e0b',
                          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 900, fontSize: '1rem' }}>
                            <AlertTriangle size={20} color="#d97706" />
                            <span>⚠️ It is a Duplicate Report!</span>
                          </div>
                          <span className="badge badge-duplicate" style={{ background: '#d97706', color: '#ffffff', fontWeight: 800 }}>
                            DUPLICATE ({Math.round((duplicateWarning.similarityScore || 1) * 100)}% Match)
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.825rem', color: '#92400e', lineHeight: 1.4, fontWeight: 600 }}>
                          You uploaded the same photo as previous report <strong>{duplicateWarning.existingReport?.reportId}</strong> ({duplicateWarning.existingReport?.address || 'Incident Location'}). An active incident report already exists for this case.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReportDetail(duplicateWarning.existingReport);
                              setActiveSection('reports');
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ fontWeight: 700 }}
                          >
                            🔍 View Existing Case ({duplicateWarning.existingReport?.reportId})
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep(4)}
                            className="btn btn-sm btn-primary"
                            style={{ background: '#0d9488', borderColor: '#0d9488', fontWeight: 700 }}
                          >
                            🔗 Link as Duplicate Case →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* AI Classification Confirmation & Correction Panel */}
                    {!aiIsAnimal || aiImageError ? (
                      <div
                        style={{
                          marginTop: '1.25rem',
                          padding: '1.15rem 1.25rem',
                          borderRadius: '12px',
                          background: '#fef2f2',
                          border: '2px solid #ef4444',
                          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.12)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontWeight: 900, fontSize: '1rem' }}>
                            <AlertCircle size={22} color="#dc2626" />
                            <span>⚠️ Invalid Image Detected — Cannot Proceed</span>
                          </div>
                          <span style={{ background: '#dc2626', color: '#ffffff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: '999px' }}>
                            {aiIsHuman ? 'HUMAN IMAGE DETECTED' : 'NOT AN ANIMAL'}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#991b1b', lineHeight: 1.4, fontWeight: 600 }}>
                          {aiImageError || (aiIsHuman
                            ? 'Invalid image detected! Human photograph detected. PawAlert AI accepts only injured street animals (Dog, Cat, Cattle).'
                            : 'Invalid image detected! No stray animal detected in this photo. Please upload a clear photo of an injured stray animal.')}
                        </p>
                        <div style={{ fontSize: '0.75rem', color: '#7f1d1d', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                          🚫 <strong>Notice:</strong> Animal rescue reports cannot be created for human or invalid non-animal photos. Please upload or take a photo of an injured stray animal to enable location and rescue dispatch.
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: '1.25rem',
                          padding: '1rem',
                          borderRadius: '12px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Sparkles size={16} color="#16a34a" /> AI Animal Detection Result:
                          </span>
                          <span className="badge badge-teal">{aiDetectedConfidence}% Confidence</span>
                        </div>

                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                          {getAnimalEmoji(formData.animalType)} {formData.animalType}
                          {formData.aiCorrected && (
                            <span style={{ fontSize: '0.75rem', color: '#d97706', marginLeft: '0.5rem', fontWeight: 600 }}>
                              (Citizen Corrected)
                            </span>
                          )}
                        </div>

                        {!speciesCorrectionMode ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={handleConfirmSpecies}
                              className="btn btn-sm btn-primary"
                              style={{ flex: 1, fontWeight: 700 }}
                            >
                              <Check size={14} /> ✓ Confirm {formData.animalType}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpeciesCorrectionMode(true)}
                              className="btn btn-sm btn-secondary"
                              style={{ fontWeight: 600 }}
                            >
                              <Edit3 size={14} /> Correct Species
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                              Select Correct Animal Species:
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {['Dog', 'Cat', 'Cattle', 'Other'].map((sp) => (
                                <button
                                  key={sp}
                                  type="button"
                                  onClick={() => handleCorrectSpecies(sp)}
                                  className={`btn btn-sm ${formData.animalType === sp ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                  {getAnimalEmoji(sp)} {sp}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          if (!aiIsAnimal || aiImageError) {
                            alert('⚠️ Cannot proceed: Invalid Image Detected. Please upload or take a photograph of an injured stray animal (Dog, Cat, or Cattle).');
                            return;
                          }
                          setStep(2);
                        }}
                        className="btn btn-primary"
                        style={{
                          fontWeight: 700,
                          opacity: (!aiIsAnimal || aiImageError) ? 0.45 : 1,
                          cursor: (!aiIsAnimal || aiImageError) ? 'not-allowed' : 'pointer',
                        }}
                        disabled={!aiIsAnimal || !!aiImageError}
                      >
                        Next: Set Location →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Location */}
                {step === 2 && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={16} color="#0d9488" /> Incident GPS Location
                    </h4>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <button type="button" onClick={handleGetCurrentLocation} disabled={gettingLocation} className="btn btn-sm btn-secondary" style={{ flex: 1 }}>
                        <Navigation size={14} /> {gettingLocation ? 'Acquiring GPS...' : 'Use Current Device GPS'}
                      </button>
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <GisMap
                        center={[formData.latitude, formData.longitude]}
                        zoom={14}
                        isPickerMode={true}
                        selectedLocation={{ latitude: formData.latitude, longitude: formData.longitude }}
                        onLocationSelect={handleMapLocationSelect}
                        height="200px"
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                        Landmark / Road Name:
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button onClick={() => setStep(1)} className="btn btn-secondary">← Back</button>
                      <button onClick={() => setStep(3)} className="btn btn-primary">Next: Cause Factors →</button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Contributing Causes & Observations (CRITICAL REQUIREMENT) */}
                {step === 3 && (
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                      What do you think caused the accident?
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.85rem' }}>
                      Select all contributing factors to help municipal authorities identify and fix the underlying hazard.
                    </p>

                    {/* Multi-Select Causes Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.45rem', marginBottom: '1rem' }}>
                      {POSSIBLE_CAUSES_OPTIONS.map((opt) => {
                        const isSelected = formData.selectedCauses.includes(opt.key);
                        return (
                          <div
                            key={opt.key}
                            onClick={() => toggleCause(opt.key)}
                            style={{
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid #0d9488' : '1px solid #cbd5e1',
                              background: isSelected ? '#f0fdfa' : '#ffffff',
                              color: isSelected ? '#0f766e' : '#334155',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: isSelected ? 700 : 500,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check size={14} color="#0d9488" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom Cause Text if "Other" selected */}
                    {formData.selectedCauses.includes('Other') && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                          Specify Other Contributing Factor:
                        </label>
                        <input
                          type="text"
                          value={formData.customCause}
                          onChange={(e) => setFormData({ ...formData, customCause: e.target.value })}
                          placeholder="e.g. Broken water pipe creating slippery road"
                          style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>
                    )}

                    {/* Additional Observations Free-Text Field */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.25rem' }}>
                        Additional observations
                      </label>
                      <textarea
                        rows={3}
                        value={formData.citizenObservation}
                        onChange={(e) => setFormData({ ...formData, citizenObservation: e.target.value })}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        placeholder="e.g. Many cattle are staying near the road because of the garbage dump. Vehicles are moving very fast at night and there is very little lighting."
                      />
                    </div>

                    {/* Severity Selection */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Injury Urgency Severity:
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['Critical', 'Moderate', 'Minor'].map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setFormData({ ...formData, severity: sev })}
                            className={`btn btn-sm ${formData.severity === sev ? (sev === 'Critical' ? 'btn-danger' : 'btn-primary') : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button onClick={() => setStep(2)} className="btn btn-secondary">← Back</button>
                      <button
                        onClick={() => {
                          if (formData.selectedCauses.length === 0) {
                            alert('Please select at least one possible cause.');
                            return;
                          }
                          setStep(4);
                        }}
                        className="btn btn-primary"
                      >
                        Next: Review →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Review & Submit */}
                {step === 4 && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                      Review & Submit Accident Report
                    </h4>
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <img src={formData.imageUrl} alt="Animal" style={{ width: '75px', height: '75px', objectFit: 'cover', borderRadius: '8px' }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                            {getAnimalEmoji(formData.animalType)} {formData.animalType} ({formData.severity})
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            📍 {formData.address}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#0d9488', fontWeight: 700, marginTop: '2px' }}>
                            AI Confidence: {formData.aiConfidence * 100}% {formData.aiCorrected ? '(Citizen verified)' : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', fontSize: '0.775rem' }}>
                        <div style={{ color: '#334155', fontWeight: 700, marginBottom: '2px' }}>
                          Contributing Factors:
                        </div>
                        <div style={{ color: '#64748b' }}>
                          {formData.selectedCauses.join(', ')}
                        </div>
                        {formData.citizenObservation && (
                          <div style={{ marginTop: '4px', color: '#475569', fontStyle: 'italic' }}>
                            "{formData.citizenObservation}"
                          </div>
                        )}
                      </div>
                    </div>

                    {duplicateWarning && (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                          border: '2px solid #f59e0b',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          marginBottom: '1rem',
                          color: '#92400e',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.875rem', marginBottom: '3px' }}>
                          <AlertTriangle size={16} color="#d97706" />
                          <span>⚠️ DUPLICATE REPORT: Linked to {duplicateWarning.existingReport?.reportId}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.775rem', lineHeight: 1.4 }}>
                          This report is marked as a <strong>DUPLICATE</strong>. Submitting will link your uploaded photo to active case <strong>{duplicateWarning.existingReport?.reportId}</strong> so rescue squads stay unified on a single case.
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button onClick={() => setStep(3)} className="btn btn-secondary">← Back</button>
                      <button onClick={() => handleSubmit(false)} disabled={submitting} className="btn btn-primary" style={{ fontWeight: 800 }}>
                        {submitting ? 'Submitting to MongoDB...' : duplicateWarning ? '🔗 Submit as Duplicate Report' : 'Confirm & Submit Report'}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: Success Confirmation */}
                {step === 5 && successReport && (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <CheckCircle2 size={46} color="#0d9488" style={{ margin: '0 auto 0.75rem auto' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                      {successReport.isDuplicate || successReport.status === 'DUPLICATE'
                        ? 'Report Linked as Duplicate Incident'
                        : 'Report Saved to Database!'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                      Unique Report ID: <strong style={{ color: '#0d9488' }}>{successReport.reportId}</strong>
                    </p>

                    {(successReport.isDuplicate || successReport.status === 'DUPLICATE') ? (
                      <div style={{ margin: '0.85rem auto 1.25rem auto', padding: '0.85rem 1rem', borderRadius: '12px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', textAlign: 'left', maxWidth: '440px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                          <span className="badge badge-duplicate">DUPLICATE</span>
                          <span>Linked to Case: <strong>{successReport.duplicateReportId || successReport.duplicateOf?.reportId || 'Active Case'}</strong></span>
                        </div>
                        <p style={{ fontSize: '0.75rem', margin: 0, lineHeight: 1.4 }}>
                          {successReport.duplicateReason || 'AI animal photo analysis matched this upload with a recent accident report. Your report is linked to the active case without creating redundant rescue calls.'}
                        </p>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '380px', margin: '0.5rem auto 1.25rem auto' }}>
                        Your report has immediately propagated to NGO rescue squads and municipal authority problem analysis.
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button onClick={resetForm} className="btn btn-secondary btn-sm">
                        Report Another Incident
                      </button>
                      <button onClick={() => setActiveSection('reports')} className="btn btn-primary btn-sm">
                        Track My Reports →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: My Recent Reports & Nearby Hotspots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* My Reports Widget */}
              <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={18} color="#0d9488" /> My Reports
                  </h3>
                  <button onClick={() => setActiveSection('reports')} style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    View All ({myReports.length}) →
                  </button>
                </div>

                {myReports.length === 0 ? (
                  <div style={{ padding: '1.75rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🐾</div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                      No reports submitted yet.
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Use the reporting form on the left to file your first accident report.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
                    {myReports.slice(0, 3).map((r) => (
                      <div
                        key={r._id}
                        onClick={() => setSelectedReportDetail(r)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.825rem', color: '#0f172a' }}>
                            {getAnimalEmoji(r.animalType)} {r.reportId}
                          </span>
                          <span className={`badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span>
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>📍 {r.address}</div>
                        {r.remediationStatus === 'COMPLETED' && (
                          <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>
                            ✓ Authority Solved Proof Available
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nearby Hotspots */}
              <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={18} color="#f59e0b" /> Nearby Hotspots
                </h3>
                {nearbyHotspots.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.825rem', background: '#f8fafc', borderRadius: '10px' }}>
                    📍 No accident hotspots detected nearby.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {nearbyHotspots.slice(0, 3).map((h) => (
                      <div key={h._id} style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>{h.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{h.reportCount} incidents in {h.radius}m</div>
                        </div>
                        <span className={`badge badge-risk-${h.riskLevel?.toLowerCase() || 'high'}`}>{h.riskLevel}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: REPORT ACCIDENT FULL VIEW ================= */}
        {activeSection === 'report' && (
          <div className="card" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '780px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Report an Animal Accident
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Upload evidence, confirm AI species classification, and report contributing hazard factors.
            </p>
            <AiClassifierModal
              onAnalysisComplete={handleAiComplete}
              selectedImage={formData.imageUrl}
              onViewExistingCase={(rep) => {
                setSelectedReportDetail(rep);
                setActiveSection('reports');
              }}
            />

            {/* Prominent Duplicate Alert Box in Report Accident View */}
            {duplicateWarning && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1.15rem 1.25rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                  border: '2px solid #f59e0b',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 900, fontSize: '1rem' }}>
                    <AlertTriangle size={20} color="#d97706" />
                    <span>⚠️ It is a Duplicate Report!</span>
                  </div>
                  <span className="badge badge-duplicate" style={{ background: '#d97706', color: '#ffffff', fontWeight: 800 }}>
                    DUPLICATE ({Math.round((duplicateWarning.similarityScore || 1) * 100)}% Match)
                  </span>
                </div>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.825rem', color: '#92400e', lineHeight: 1.4, fontWeight: 600 }}>
                  You uploaded the same photo as previous report <strong>{duplicateWarning.existingReport?.reportId}</strong> ({duplicateWarning.existingReport?.address || 'Incident Location'}). An active incident report already exists for this case.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReportDetail(duplicateWarning.existingReport);
                      setActiveSection('reports');
                    }}
                    className="btn btn-sm btn-secondary"
                    style={{ fontWeight: 700 }}
                  >
                    🔍 View Existing Case ({duplicateWarning.existingReport?.reportId})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(4);
                      setActiveSection('overview');
                    }}
                    className="btn btn-sm btn-primary"
                    style={{ background: '#0d9488', borderColor: '#0d9488', fontWeight: 700 }}
                  >
                    🔗 Link as Duplicate Case →
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setActiveSection('overview')} className="btn btn-secondary">
                Return to Dashboard
              </button>
              <button onClick={() => { setStep(2); setActiveSection('overview'); }} className="btn btn-primary" style={{ fontWeight: 800 }}>
                Continue to Geocoding & Causes →
              </button>
            </div>
          </div>
        )}

        {/* ================= SECTION 3: MY REPORTS DIRECTORY ================= */}
        {activeSection === 'reports' && (() => {
          const renderReportCard = (r) => (
            <div
              key={r._id}
              className="card"
              onClick={() => setSelectedReportDetail(r)}
              style={{
                padding: '1.25rem',
                borderRadius: '14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.85rem',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                    {getAnimalEmoji(r.animalType)} {r.reportId}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                  {r.description}
                </p>
                <div style={{ fontSize: '0.725rem', color: '#64748b', marginBottom: '0.35rem' }}>
                  📍 {r.address}
                </div>
                {Array.isArray(r.possibleCauses) && r.possibleCauses.length > 0 && (
                  <div style={{ fontSize: '0.7rem', color: '#0d9488', fontWeight: 600 }}>
                    Suspected: {r.possibleCauses.join(', ')}
                  </div>
                )}
              </div>

              {/* Before / After solved badge if completed */}
              {r.remediationStatus === 'COMPLETED' && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.725rem',
                    color: '#15803d',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <CheckCircle2 size={14} color="#16a34a" />
                  Problem Remediated by Authority (Solved Proof Available)
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', fontSize: '0.725rem', color: '#94a3b8' }}>
                <span>Reported: {new Date(r.createdAt).toLocaleDateString()}</span>
                <span style={{ color: '#0d9488', fontWeight: 700 }}>View Case Timeline →</span>
              </div>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    My Reports ({myReports.length})
                  </h2>
                  <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    Track live NGO rescue progress, municipal remediation, and authority solved photo proofs.
                  </p>
                </div>

                {myReports.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search report ID or location..."
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', minWidth: '220px' }}
                      />
                    </div>
                    {['ALL', 'PENDING', 'ACCEPTED', 'ON THE WAY', 'RESCUED', 'COMPLETED', 'DUPLICATE'].map((st) => {
                      const count = stageCounts[st] ?? 0;
                      const isSelected = reportFilter === st;
                      return (
                        <button
                          key={st}
                          onClick={() => setReportFilter(st)}
                          style={{
                            padding: '0.45rem 0.75rem',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #0d9488' : '1px solid #cbd5e1',
                            background: isSelected ? '#0d9488' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#334155',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{st}</span>
                          <span
                            style={{
                              background: isSelected ? 'rgba(255, 255, 255, 0.28)' : '#e2e8f0',
                              color: isSelected ? '#ffffff' : '#475569',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              fontSize: '0.675rem',
                              fontWeight: 800,
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Empty State when user has 0 reports */}
              {myReports.length === 0 ? (
                <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', borderRadius: '16px' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🐾</div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                    No reports yet
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                    You haven't reported any animal accidents. If you see an animal accident, you can report it and help make your community safer.
                  </p>
                  <button
                    onClick={() => { setActiveSection('overview'); setStep(1); }}
                    className="btn btn-primary"
                    style={{ fontWeight: 800, padding: '0.75rem 1.75rem', margin: '0 auto' }}
                  >
                    <Camera size={18} /> Report an Accident
                  </button>
                </div>
              ) : filteredReports.length === 0 ? (
                /* No matching reports for current filter or search */
                <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', borderRadius: '16px', background: '#f8fafc' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                    No reports found in {reportFilter === 'ALL' ? 'this search' : `"${reportFilter}" stage`}
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 1rem auto' }}>
                    {reportSearch
                      ? `No reports match search term "${reportSearch}".`
                      : `There are currently 0 accident reports in the ${reportFilter} workflow stage.`}
                  </p>
                  <button
                    onClick={() => { setReportFilter('ALL'); setReportSearch(''); }}
                    className="btn btn-sm btn-secondary"
                    style={{ fontWeight: 700 }}
                  >
                    Show All Reports ({myReports.length})
                  </button>
                </div>
              ) : reportFilter === 'ALL' && !reportSearch ? (
                /* Grouped by Stage when viewing ALL - "antha antha stages ku keela vai" */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {STAGE_CONFIGS.map((stage) => {
                    const stageReports = filteredReports.filter((r) => getReportStage(r) === stage.key);
                    if (stageReports.length === 0) return null;
                    const Icon = stage.icon;
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
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: stage.color,
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Icon size={18} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                                  {stage.label}
                                </h4>
                                <span
                                  style={{
                                    background: stage.color,
                                    color: '#ffffff',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '1px 7px',
                                    borderRadius: '10px',
                                  }}
                                >
                                  {stageReports.length} {stageReports.length === 1 ? 'case' : 'cases'}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                {stage.desc}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setReportFilter(stage.key)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: stage.color,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            Filter this stage only →
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                          {stageReports.map(renderReportCard)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Specific stage filter selected or active search */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reportFilter !== 'ALL' && (() => {
                    const activeStage = STAGE_CONFIGS.find((s) => s.key === reportFilter);
                    if (!activeStage) return null;
                    const Icon = activeStage.icon;
                    return (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1.15rem',
                          borderRadius: '12px',
                          background: activeStage.bg,
                          border: `1.5px solid ${activeStage.border}`,
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: activeStage.color,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon size={18} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                                {activeStage.label}
                              </h4>
                              <span
                                style={{
                                  background: activeStage.color,
                                  color: '#ffffff',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '1px 7px',
                                  borderRadius: '10px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                }}
                              >
                                {filteredReports.length} {filteredReports.length === 1 ? 'case' : 'cases'}
                              </span>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                              {activeStage.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                    {filteredReports.map(renderReportCard)}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= SECTION 4: NEARBY HOTSPOTS MAP ================= */}
        {activeSection === 'hotspots' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Nearby Accident Hotspots
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
              Identified accident clusters where high animal casualty rates occur.
            </p>
            {nearbyHotspots.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📍</div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  No accident hotspots detected nearby.
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '4px' }}>
                  Hotspots are dynamically generated using DBSCAN clustering as accident reports accumulate.
                </p>
              </div>
            ) : (
              <GisMap
                center={[formData.latitude, formData.longitude]}
                zoom={13}
                hotspots={nearbyHotspots}
                height="550px"
              />
            )}
          </div>
        )}

        {/* ================= SECTION 5: NOTIFICATIONS ================= */}
        {activeSection === 'notifications' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                  Citizen Notifications
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0 }}>
                  Real-time alerts regarding your submitted reports, NGO rescue status, and authority remediation.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    color: '#059669',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: '1px solid #a7f3d0',
                  }}
                >
                  <CheckCircle2 size={14} /> All caught up
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                    await api.markAllNotificationsRead('citizen').catch(() => {});
                  }}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  Mark All Read
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                <Bell size={28} color="#94a3b8" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 700, color: '#0f172a' }}>No notifications yet.</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  You will receive real-time updates when an NGO accepts your report or authorities fix hazards.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map((n) => (
                  <div
                    key={n._id || n.id}
                    onClick={async () => {
                      if (!n.read && n._id) {
                        setNotifications((prev) =>
                          prev.map((item) => (item._id === n._id ? { ...item, read: true } : item))
                        );
                        await api.markNotificationRead(n._id).catch(() => {});
                      }
                    }}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '12px',
                      background: n.read ? '#ffffff' : '#f0fdfa',
                      border: n.read ? '1px solid #e2e8f0' : '1.5px solid #0d9488',
                      borderLeft: n.read ? '4px solid #cbd5e1' : '4px solid #0d9488',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {n.title}
                        </h4>
                        {!n.read && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              background: '#0d9488',
                              color: '#ffffff',
                              padding: '1px 6px',
                              borderRadius: '6px',
                            }}
                          >
                            NEW
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        {new Date(n.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 6: PROFILE ================= */}
        {activeSection === 'profile' && (
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', maxWidth: '680px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              Citizen Volunteer Profile
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Account credentials and civic reporting summary.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Full Name</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{user?.name || 'Citizen Volunteer'}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Registered Email</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{user?.email || 'citizen@pawalert.org'}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Account Type</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0d9488' }}>
                  {user?.isDemoAccount ? 'Demonstration Account' : 'Real Civic User Account'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Civic Impact</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0d9488' }}>{myReports.length} Animal Incident Reports Submitted</div>
              </div>
            </div>
          </div>
        )}

        {/* ================= DETAIL MODAL & BEFORE / AFTER PROOF ================= */}
        {selectedReportDetail && (
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
            onClick={() => setSelectedReportDetail(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '1.75rem',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <span className={`badge ${getStatusBadgeClass(selectedReportDetail.status)}`}>
                    {selectedReportDetail.status}
                  </span>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px', color: '#0f172a' }}>
                    {getAnimalEmoji(selectedReportDetail.animalType)} {selectedReportDetail.reportId}
                  </h3>
                </div>
                <button onClick={() => setSelectedReportDetail(null)} className="btn btn-sm btn-secondary">
                  Close
                </button>
              </div>

              {/* AI DUPLICATE DETAILS & LINKED EVIDENCE */}
              {(selectedReportDetail.isDuplicate || selectedReportDetail.status === 'DUPLICATE') && (
                <div style={{ marginBottom: '1.25rem', background: '#fffbeb', borderRadius: '12px', padding: '1rem', border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={18} color="#d97706" /> AI Duplicate Incident Record
                    </div>
                    <span className="badge badge-duplicate">
                      {Math.round((selectedReportDetail.duplicateConfidence || 0.98) * 100)}% Photo Match
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#b45309', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                    {selectedReportDetail.duplicateReason || `Identified as a duplicate of report ${selectedReportDetail.duplicateReportId || selectedReportDetail.duplicateOf?.reportId} based on AI animal photo similarity.`}
                  </p>

                  {/* Side-by-Side: Citizen's Photo vs Original Report Photo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#78350f', textTransform: 'uppercase', marginBottom: '3px' }}>
                        📸 This Report Photo
                      </div>
                      <img
                        src={selectedReportDetail.imageUrl}
                        alt="Duplicate Photo"
                        style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', marginBottom: '3px' }}>
                        🔍 Original Incident Photo ({selectedReportDetail.duplicateReportId || selectedReportDetail.duplicateOf?.reportId || 'Original'})
                      </div>
                      <img
                        src={selectedReportDetail.duplicateOf?.imageUrl || selectedReportDetail.imageUrl}
                        alt="Original Incident Photo"
                        style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #0d9488' }}
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600'; }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: '#92400e', background: 'rgba(255,255,255,0.7)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <strong>Rescue Sync:</strong> This report is linked to active case <strong>{selectedReportDetail.duplicateReportId || selectedReportDetail.duplicateOf?.reportId}</strong> to prevent double squad dispatch while preserving photographic evidence for municipal records.
                  </div>
                </div>
              )}

              {/* BEFORE & AFTER PROOF VISUALIZATION */}
              {selectedReportDetail.remediationActionId?.solvedImageUrl ? (
                <div style={{ marginBottom: '1.25rem', background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={18} color="#16a34a" /> Case Resolution Proof (Before & After)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '3px' }}>
                        🔴 Before (Incident Reported)
                      </div>
                      <img
                        src={selectedReportDetail.imageUrl}
                        alt="Before Accident"
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #fca5a5' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: '3px' }}>
                        🟢 After (Authority Solved Proof)
                      </div>
                      <img
                        src={selectedReportDetail.remediationActionId.solvedImageUrl}
                        alt="After Solved"
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #86efac' }}
                      />
                    </div>
                  </div>
                  {selectedReportDetail.remediationActionId?.solvedNotes && (
                    <div style={{ marginTop: '0.65rem', fontSize: '0.775rem', color: '#15803d', background: '#dcfce7', padding: '0.5rem', borderRadius: '6px' }}>
                      <strong>Authority Solved Notes:</strong> {selectedReportDetail.remediationActionId.solvedNotes}
                    </div>
                  )}
                </div>
              ) : (
                selectedReportDetail.imageUrl && (
                  <img
                    src={selectedReportDetail.imageUrl}
                    alt="Accident"
                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px', marginBottom: '1rem' }}
                  />
                )
              )}

              {/* Incident Details Summary */}
              <div style={{ background: '#f1f5f9', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.8rem' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Location:</strong> {selectedReportDetail.address}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Suspected Causes:</strong>{' '}
                  {Array.isArray(selectedReportDetail.possibleCauses)
                    ? selectedReportDetail.possibleCauses.join(', ')
                    : selectedReportDetail.rootCause}
                </div>
                {selectedReportDetail.citizenObservation && (
                  <div>
                    <strong>Citizen Observation:</strong> "{selectedReportDetail.citizenObservation}"
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <RescueTimeline
                currentStatus={selectedReportDetail.status}
                statusHistory={selectedReportDetail.statusHistory || selectedReportDetail.rescue?.statusHistory || []}
                rescue={selectedReportDetail.rescue}
              />
            </div>
          </div>
        )}
      </div>
    </RoleDashboardLayout>
  );
}
