import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Truck,
  HeartHandshake,
  MapPin,
  FileText,
  UserCheck,
  ShieldCheck,
  Activity,
  ArrowRight,
  AlertTriangle,
  Phone,
  Sparkles,
  Stethoscope,
  Send,
  Building,
  RotateCcw,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { STAGES, resolveStageIndex, formatTimeAgo } from './RescueTimeline';
import { api } from '../services/api';
import { soundService } from '../services/soundService';

// Dynamic smart preset notes tailored to each workflow stage
const STAGE_PRESETS = {
  REQUESTED: [
    'Citizen report received with GPS coordinates and photo evidence.',
    'Under review by NGO triage coordinator.',
    'Verifying accident severity and road hazards.',
  ],
  ASSIGNED: [
    'Emergency squad alerted and assigned to case.',
    'Rescue team dispatched with transport vehicle.',
    'Nearest volunteer responder notified on emergency channel.',
  ],
  ACCEPTED: [
    'Rescue squad accepted dispatch; assembling veterinary kit.',
    'Ambulance preparing specialized animal stretcher and trauma kit.',
    'Veterinarian on standby for patient arrival.',
  ],
  'ON THE WAY': [
    'Ambulance en route to scene with sirens active. ETA ~8 mins.',
    'Rescue vehicle navigating heavy traffic towards GPS location.',
    'Squad in transit; contact made with citizen reporter to secure perimeter.',
    'Driver dispatched with oxygen kit and transport crate.',
  ],
  'ANIMAL REACHED': [
    'Squad arrived on scene. Injured animal found and secured safely.',
    'Administering emergency first aid and stabilizing vitals.',
    'Active bleeding controlled; antiseptic wound dressing applied.',
    'Splint applied to fractured limb; patient immobilized on stretcher.',
    'Severe trauma observed; administering emergency pain relief.',
  ],
  RESCUED: [
    'Animal safely secured inside rescue ambulance; en route to clinic.',
    'Under intensive veterinary treatment at animal trauma hospital.',
    'IV fluid resuscitation initiated; vitals stabilizing.',
    'Emergency surgery and radiographic examination in progress.',
    'Admitted to intensive care unit for 24-hour medical observation.',
  ],
  COMPLETED: [
    'Patient fully recovered and released into safe sanctuary.',
    'Surgical wounds healed completely; microchipped and vaccinated.',
    'Transferred to animal welfare adoption center in excellent health.',
    'Case successfully resolved; citizen reporter notified with thanks.',
  ],
};

const CLINICAL_INTERVENTIONS = [
  'Antiseptic Wound Dressing',
  'IV Saline Fluids',
  'Limb Splint / Bandage',
  'Pain Relief / Sedation',
  'Oxygen / Thermal Care',
  'Antibiotics Administered',
  'Orthopedic Surgery',
];

const VITALS_OPTIONS = [
  { label: 'Critical', color: '#e11d48', bg: '#ffe4e6' },
  { label: 'Guarded', color: '#ea580c', bg: '#ffedd5' },
  { label: 'Stable', color: '#0d9488', bg: '#ccfbf1' },
  { label: 'In Surgery', color: '#7c3aed', bg: '#ede9fe' },
  { label: 'Recovered', color: '#16a34a', bg: '#dcfce7' },
];

export default function RescueTimelineModal({
  rescue,
  isOpen,
  onClose,
  onSuccess,
}) {
  if (!isOpen || !rescue) return null;

  const currentStatus = rescue.status || 'Requested';
  const currentStageIndex = resolveStageIndex(currentStatus);

  // Next logical recommended stage index
  const nextRecommendedIndex = Math.min(currentStageIndex + 1, STAGES.length - 1);
  const nextRecommendedKey = STAGES[nextRecommendedIndex].key;

  const [targetStatus, setTargetStatus] = useState(
    currentStageIndex < STAGES.length - 1 ? nextRecommendedKey : currentStatus
  );
  const [medicalNotes, setMedicalNotes] = useState(rescue.medicalNotes || '');
  const [assignedVolunteer, setAssignedVolunteer] = useState(
    rescue.assignedVolunteer && rescue.assignedVolunteer !== 'Unassigned'
      ? rescue.assignedVolunteer
      : 'Squad 2 (Dr. Ravi - Highway Express)'
  );
  const [volunteerPhone, setVolunteerPhone] = useState(
    rescue.volunteerPhone || '+91 94433 11223'
  );
  const [shelterLocation, setShelterLocation] = useState(
    rescue.shelterLocation || 'City Animal Hospital & Trauma Sanctuary'
  );
  const [selectedVitals, setSelectedVitals] = useState('Stable');
  const [selectedInterventions, setSelectedInterventions] = useState([]);
  const [activeTab, setActiveTab] = useState('update'); // 'update' | 'history'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync state if a different rescue is opened
  useEffect(() => {
    if (rescue) {
      const idx = resolveStageIndex(rescue.status);
      const nextKey = STAGES[Math.min(idx + 1, STAGES.length - 1)].key;
      setTargetStatus(idx < STAGES.length - 1 ? nextKey : rescue.status);
      setMedicalNotes(rescue.medicalNotes || '');
      setAssignedVolunteer(
        rescue.assignedVolunteer && rescue.assignedVolunteer !== 'Unassigned'
          ? rescue.assignedVolunteer
          : 'Squad 2 (Dr. Ravi - Highway Express)'
      );
      setVolunteerPhone(rescue.volunteerPhone || '+91 94433 11223');
      setShelterLocation(rescue.shelterLocation || 'City Animal Hospital & Trauma Sanctuary');
      setErrorMsg(null);
    }
  }, [rescue?._id]);

  // Handle hotkeys (Ctrl+Enter to save, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const targetStageIndex = resolveStageIndex(targetStatus);
  const currentStageObj = STAGES[currentStageIndex] || STAGES[0];
  const targetStageObj = STAGES[targetStageIndex] || STAGES[0];

  const presetsForTarget = STAGE_PRESETS[targetStatus] || STAGE_PRESETS[targetStageObj.key] || [];

  const handleToggleIntervention = (item) => {
    setSelectedInterventions((prev) => {
      const next = prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item];
      return next;
    });
  };

  const handleApplyPreset = (presetText) => {
    try {
      soundService.playClick?.();
    } catch (e) {}
    setMedicalNotes((prev) => {
      if (!prev || prev.trim() === '') return presetText;
      if (prev.includes(presetText)) return prev;
      return `${prev.trim()}\n• ${presetText}`;
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!rescue || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Build combined notes if interventions were selected
      let finalNotes = medicalNotes.trim();
      if (selectedInterventions.length > 0) {
        const interventionsSummary = `[Interventions: ${selectedInterventions.join(', ')} | Patient Vitals: ${selectedVitals}]`;
        if (!finalNotes.includes('[Interventions:')) {
          finalNotes = finalNotes ? `${finalNotes}\n${interventionsSummary}` : interventionsSummary;
        }
      }

      const res = await api.updateRescueStatus(rescue._id, {
        status: targetStatus,
        notes: finalNotes || `Status advanced to ${targetStatus}`,
        assignedVolunteer,
        volunteerPhone,
        shelterLocation,
      });

      if (res.success) {
        try {
          soundService.playNotification?.();
        } catch (err) {}

        if (targetStatus === 'RESCUED' || targetStatus === 'COMPLETED') {
          confetti({
            particleCount: 100,
            spread: 75,
            origin: { y: 0.55 },
          });
        }

        if (onSuccess) {
          onSuccess(res.request || res);
        }
        onClose();
      } else {
        throw new Error(res.message || 'Failed to update rescue status.');
      }
    } catch (err) {
      console.error('Update status failed:', err);
      setErrorMsg(err.message || 'An error occurred while updating status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compile full history logs
  const historyLogs = Array.isArray(rescue.statusHistory) && rescue.statusHistory.length > 0
    ? rescue.statusHistory
    : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '780px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '1.25rem 1.5rem',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                🐾 {rescue.reportId?.animalType || 'Animal'} Rescue Case:
                <span style={{ color: '#38bdf8' }}>{rescue.reportId?.reportId || rescue._id?.slice(-6)}</span>
              </span>

              <span
                style={{
                  background: currentStageObj.statusColor,
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 9px',
                  borderRadius: '999px',
                  letterSpacing: '0.04em',
                  boxShadow: `0 0 10px ${currentStageObj.statusColor}88`,
                }}
              >
                Current: {currentStatus}
              </span>

              {rescue.priority && (
                <span
                  style={{
                    background: rescue.priority === 'Critical' ? '#e11d48' : '#ea580c',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {rescue.priority} Priority
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: '0.785rem',
                color: '#94a3b8',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="#38bdf8" />
                {rescue.reportId?.address || 'Incident Scene Coordinates'}
              </span>
              {rescue.reportId?.citizenPhone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={12} color="#4ade80" />
                  Reporter: {rescue.reportId.citizenPhone}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* TAB SWITCHER */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '0 1.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('update')}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.825rem',
              fontWeight: 800,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'update' ? '#0d9488' : '#64748b',
              borderBottom: activeTab === 'update' ? '3px solid #0d9488' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={15} /> Update Timeline & Clinical Care
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.825rem',
              fontWeight: 800,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'history' ? '#0d9488' : '#64748b',
              borderBottom: activeTab === 'history' ? '3px solid #0d9488' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
            }}
          >
            <Activity size={15} /> Operations Audit Trail ({historyLogs.length})
          </button>
        </div>

        {/* BODY SCROLLABLE AREA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                color: '#b91c1c',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: UPDATE STUDIO */}
          {activeTab === 'update' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* STAGE ADVANCEMENT SUMMARY BANNER */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
                  border: '1.5px solid #99f6e4',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#0d9488', letterSpacing: '0.05em' }}>
                    Workflow Stage Advancement
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      {currentStageObj.label} (Current)
                    </span>
                    <ArrowRight size={14} color="#0d9488" strokeWidth={3} />
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: targetStageObj.statusColor }}>
                      {targetStageObj.label} (New Status)
                    </span>
                  </div>
                </div>

                {/* Quick Advance Button */}
                {currentStageIndex < STAGES.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus(nextRecommendedKey);
                      try {
                        soundService.playClick?.();
                      } catch (e) {}
                    }}
                    style={{
                      background: targetStatus === nextRecommendedKey ? '#0d9488' : '#ffffff',
                      color: targetStatus === nextRecommendedKey ? '#ffffff' : '#0d9488',
                      border: '1.5px solid #0d9488',
                      borderRadius: '8px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 5px rgba(13, 148, 136, 0.15)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <CheckCircle2 size={14} /> ⚡ Fast-Forward: Set Next Stage
                  </button>
                )}
              </div>

              {/* 7-STAGE INTERACTIVE STEPPER SELECTOR */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>
                  Select Next Workflow Stage: (Click any stage below to jump directly)
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
                    gap: '0.5rem',
                  }}
                >
                  {STAGES.map((s, idx) => {
                    const isSelected = targetStatus === s.key;
                    const isCurrent = currentStageIndex === idx;
                    const isPast = idx < currentStageIndex;
                    const Icon = s.icon;

                    return (
                      <button
                        type="button"
                        key={s.key}
                        onClick={() => {
                          setTargetStatus(s.key);
                          try {
                            soundService.playClick?.();
                          } catch (e) {}
                        }}
                        style={{
                          background: isSelected
                            ? `${s.statusColor}14`
                            : isCurrent
                            ? '#f1f5f9'
                            : '#ffffff',
                          border: `2px solid ${
                            isSelected
                              ? s.statusColor
                              : isCurrent
                              ? '#94a3b8'
                              : '#e2e8f0'
                          }`,
                          borderRadius: '12px',
                          padding: '0.65rem 0.4rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: '0.3rem',
                          cursor: 'pointer',
                          position: 'relative',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isSelected
                            ? `0 4px 12px ${s.statusColor}33`
                            : '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isSelected
                              ? s.statusColor
                              : isPast
                              ? '#0d9488'
                              : isCurrent
                              ? '#64748b'
                              : '#cbd5e1',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                          }}
                        >
                          <Icon size={14} />
                        </div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: isSelected ? 800 : 700,
                            color: isSelected ? s.statusColor : '#334155',
                            lineHeight: 1.15,
                          }}
                        >
                          {s.shortName}
                        </span>

                        {isCurrent && (
                          <span
                            style={{
                              fontSize: '0.525rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              background: '#64748b',
                              color: '#ffffff',
                              padding: '1px 4px',
                              borderRadius: '4px',
                            }}
                          >
                            Current
                          </span>
                        )}

                        {isSelected && !isCurrent && (
                          <span
                            style={{
                              fontSize: '0.525rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              background: s.statusColor,
                              color: '#ffffff',
                              padding: '1px 4px',
                              borderRadius: '4px',
                            }}
                          >
                            Target ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SMART 1-CLICK PRESET NOTES CHIPS */}
              {presetsForTarget.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>
                      ⚡ Smart Presets for "{targetStageObj.label}" (Click to auto-fill notes):
                    </label>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {presetsForTarget.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.725rem',
                          color: '#1e293b',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#e2e8f0';
                          e.currentTarget.style.borderColor = '#94a3b8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                      >
                        <span>+ {preset}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MEDICAL & TIMELINE NOTES TEXTAREA */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>
                    Veterinary Medical Notes & Squad Dispatch Log:
                  </label>
                  {medicalNotes && (
                    <button
                      type="button"
                      onClick={() => setMedicalNotes('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Clear Notes
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    lineHeight: 1.4,
                    outline: 'none',
                    transition: 'border 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
                  onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                  placeholder="e.g. Squad on scene. Emergency antiseptic dressing applied. Patient calm and stabilized for transport."
                />
              </div>

              {/* CLINICAL VITALS & INTERVENTIONS CHECKLIST */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '0.9rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  <Stethoscope size={15} color="#0d9488" />
                  <span style={{ fontSize: '0.785rem', fontWeight: 800, color: '#1e293b' }}>
                    Clinical Assessment & First-Aid Interventions (Optional)
                  </span>
                </div>

                {/* Vitals buttons */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
                    Current Animal Condition:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {VITALS_OPTIONS.map((v) => (
                      <button
                        key={v.label}
                        type="button"
                        onClick={() => setSelectedVitals(v.label)}
                        style={{
                          background: selectedVitals === v.label ? v.bg : '#ffffff',
                          border: `1.5px solid ${selectedVitals === v.label ? v.color : '#e2e8f0'}`,
                          color: selectedVitals === v.label ? v.color : '#475569',
                          borderRadius: '8px',
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.725rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interventions chips */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
                    Field Care Delivered:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {CLINICAL_INTERVENTIONS.map((ci) => {
                      const active = selectedInterventions.includes(ci);
                      return (
                        <button
                          key={ci}
                          type="button"
                          onClick={() => handleToggleIntervention(ci)}
                          style={{
                            background: active ? '#0d9488' : '#ffffff',
                            color: active ? '#ffffff' : '#334155',
                            border: `1px solid ${active ? '#0d9488' : '#cbd5e1'}`,
                            borderRadius: '6px',
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s',
                          }}
                        >
                          {active && <Check size={12} strokeWidth={3} />}
                          {ci}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SQUAD & AMBULANCE DESTINATION DETAILS */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                    Assigned Squad Lead:
                  </label>
                  <input
                    type="text"
                    value={assignedVolunteer}
                    onChange={(e) => setAssignedVolunteer(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                    }}
                    placeholder="e.g. Squad 2 (Dr. Ravi)"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                    Squad Phone:
                  </label>
                  <input
                    type="text"
                    value={volunteerPhone}
                    onChange={(e) => setVolunteerPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                    }}
                    placeholder="+91 94433 11223"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                    Shelter / Clinic Destination:
                  </label>
                  <input
                    type="text"
                    value={shelterLocation}
                    onChange={(e) => setShelterLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                    }}
                    placeholder="e.g. Central Care Center"
                  />
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: FULL OPERATIONS AUDIT TRAIL */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>
                    Operations Chronology & Dispatch Milestone Audit
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    Immutable historical trail of all field status advancements and medical updates.
                  </div>
                </div>

                <span
                  style={{
                    background: '#0d9488',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '999px',
                  }}
                >
                  {historyLogs.length} Events Logged
                </span>
              </div>

              {historyLogs.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                  }}
                >
                  <Clock size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                  <div>No history logs recorded yet for this rescue case.</div>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '1rem', marginTop: '0.5rem' }}>
                  {/* Vertical Track Line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      bottom: '12px',
                      left: '23px',
                      width: '3px',
                      background: '#e2e8f0',
                      borderRadius: '999px',
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {historyLogs.map((log, idx) => {
                      const matchedStage = STAGES.find(
                        (s) =>
                          s.key === String(log.status).toUpperCase() ||
                          s.aliases.includes(String(log.status).toUpperCase())
                      ) || STAGES[0];
                      const Icon = matchedStage.icon;
                      const timeAgo = formatTimeAgo(log.timestamp);

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '1rem',
                            position: 'relative',
                            zIndex: 1,
                          }}
                        >
                          {/* Node Icon */}
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: matchedStage.statusColor,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 0 0 4px #ffffff, 0 2px 6px ${matchedStage.statusColor}44`,
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={14} />
                          </div>

                          {/* Event Card */}
                          <div
                            style={{
                              flex: 1,
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '0.75rem 1rem',
                              borderLeft: `4px solid ${matchedStage.statusColor}`,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                                marginBottom: '4px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span
                                  style={{
                                    fontSize: '0.725rem',
                                    fontWeight: 900,
                                    color: matchedStage.statusColor,
                                    background: `${matchedStage.statusColor}18`,
                                    padding: '2px 7px',
                                    borderRadius: '5px',
                                  }}
                                >
                                  {log.status}
                                </span>
                                {log.updatedBy && (
                                  <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                                    by <strong>{log.updatedBy}</strong>
                                  </span>
                                )}
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f172a' }}>
                                  {timeAgo}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '6px' }}>
                                  ({new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                </span>
                              </div>
                            </div>

                            {log.notes && (
                              <p
                                style={{
                                  margin: '4px 0 0 0',
                                  fontSize: '0.8rem',
                                  color: '#334155',
                                  lineHeight: 1.4,
                                }}
                              >
                                {log.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Shortcut: <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Ctrl + Enter</kbd> to save
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                background: targetStageObj.statusColor,
                borderColor: targetStageObj.statusColor,
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '0.5rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: `0 4px 12px ${targetStageObj.statusColor}44`,
              }}
            >
              {isSubmitting ? (
                <>Saving Status Update...</>
              ) : (
                <>
                  <Send size={14} /> Update Timeline to {targetStageObj.label} ➔
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
