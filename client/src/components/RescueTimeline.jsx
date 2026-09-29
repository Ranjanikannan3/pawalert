import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  HeartHandshake,
  MapPin,
  FileText,
  UserCheck,
  ShieldCheck,
  Check,
  Activity,
  ArrowRight,
} from 'lucide-react';

export const STAGES = [
  {
    key: 'REQUESTED',
    label: 'Requested',
    shortName: 'Requested',
    icon: FileText,
    aliases: ['REQUESTED', 'PENDING', 'SUBMITTED', 'UNDER REVIEW', 'REPORTED', 'NEW'],
    description: 'Accident reported by citizen with GPS location and photo evidence.',
    statusColor: '#0284c7',
  },
  {
    key: 'ASSIGNED',
    label: 'Assigned',
    shortName: 'Assigned',
    icon: UserCheck,
    aliases: ['ASSIGNED', 'DISPATCH_ASSIGNED', 'SQUAD ASSIGNED', 'VOLUNTEER ASSIGNED'],
    description: 'Rescue team or volunteer squad assigned to incident.',
    statusColor: '#d97706',
  },
  {
    key: 'ACCEPTED',
    label: 'Accepted',
    shortName: 'Accepted',
    icon: CheckCircle2,
    aliases: ['ACCEPTED', 'ACKNOWLEDGED', 'CONFIRMED', 'SQUAD ACCEPTED'],
    description: 'Rescue partner accepted dispatch; preparing veterinary equipment.',
    statusColor: '#0d9488',
  },
  {
    key: 'ON THE WAY',
    label: 'On the Way',
    shortName: 'On the Way',
    icon: Truck,
    aliases: ['ON THE WAY', 'ON_THE_WAY', 'EN ROUTE', 'DISPATCHED', 'AMBULANCE DISPATCHED'],
    description: 'Animal rescue squad/ambulance actively en route to scene.',
    statusColor: '#7c3aed',
  },
  {
    key: 'ANIMAL REACHED',
    label: 'Animal Reached',
    shortName: 'Animal Reached',
    icon: MapPin,
    aliases: ['ANIMAL REACHED', 'ANIMAL_REACHED', 'AT SCENE', 'REACHED', 'ON SCENE'],
    description: 'Squad on scene administering emergency first aid and stabilization.',
    statusColor: '#ea580c',
  },
  {
    key: 'RESCUED',
    label: 'Rescued',
    shortName: 'Rescued',
    icon: HeartHandshake,
    aliases: ['RESCUED', 'STABILIZED', 'IN TRANSIT', 'SAVED'],
    description: 'Injured animal safely secured and transported to clinic/shelter.',
    statusColor: '#16a34a',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    shortName: 'Completed',
    icon: ShieldCheck,
    aliases: ['COMPLETED', 'RESOLVED', 'CLOSED', 'ARCHIVED', 'FINISHED'],
    description: 'Veterinary treatment completed; animal placed in safe sanctuary.',
    statusColor: '#059669',
  },
];

/**
 * Resolve current status string (case-insensitive & aliases) to stage index
 */
export function resolveStageIndex(status) {
  if (!status) return 0;
  const normalized = String(status).toUpperCase().trim().replace(/_/g, ' ');

  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].aliases.includes(normalized) || STAGES[i].key === normalized || STAGES[i].label.toUpperCase() === normalized) {
      return i;
    }
  }

  // Handle special states
  if (normalized === 'DUPLICATE') return 2; // Linked to accepted active case
  if (normalized === 'CANCELLED') return 0;

  return 0;
}

export function formatTimeAgo(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

export default function RescueTimeline({
  currentStatus = 'Requested',
  targetStatus = null,
  statusHistory = [],
  rescue = null,
  selectable = false,
  onSelectStage = null,
  compact = false,
  hideLogs = false,
}) {
  const currentIndex = resolveStageIndex(currentStatus);
  const currentStage = STAGES[currentIndex] || STAGES[0];
  const isDuplicate = String(currentStatus).toUpperCase() === 'DUPLICATE';
  const isCancelled = String(currentStatus).toUpperCase() === 'CANCELLED';

  // Calculate percentage of track completion
  const progressPercent = currentIndex <= 0 ? 0 : Math.round((currentIndex / (STAGES.length - 1)) * 100);

  // Compile history logs
  const historyLogs = Array.isArray(statusHistory) && statusHistory.length > 0
    ? statusHistory
    : rescue?.statusHistory || [];

  const targetIndex = targetStatus ? resolveStageIndex(targetStatus) : -1;

  // Compact layout (designed for dashboard cards and inline table previews)
  if (compact) {
    return (
      <div style={{ padding: '0.4rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: currentStage.statusColor,
                display: 'inline-block',
                boxShadow: `0 0 6px ${currentStage.statusColor}`,
              }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
              Stage {currentIndex + 1}/7: {currentStage.label}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: currentStage.statusColor }}>
            {progressPercent}% Complete
          </span>
        </div>

        {/* Mini progress line */}
        <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, #0d9488, ${currentStage.statusColor})`,
              borderRadius: '999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Mini stage dots */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
          {STAGES.map((s, idx) => {
            const isDone = idx <= currentIndex;
            const isCurr = idx === currentIndex;
            return (
              <div
                key={s.key}
                onClick={() => selectable && onSelectStage && onSelectStage(s.key)}
                style={{
                  cursor: selectable ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
                title={`${s.label}: ${s.description}`}
              >
                <div
                  style={{
                    width: isCurr ? '10px' : '6px',
                    height: isCurr ? '10px' : '6px',
                    borderRadius: '50%',
                    background: isCurr ? s.statusColor : isDone ? '#0d9488' : '#cbd5e1',
                    border: isCurr ? `2px solid #ffffff` : 'none',
                    boxShadow: isCurr ? `0 0 0 2px ${s.statusColor}` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* 1. CURRENT ACTIVE STATUS SUMMARY CARD */}
      <div
        style={{
          background: isDuplicate
            ? '#fffbeb'
            : isCancelled
            ? '#fef2f2'
            : '#f0fdfa',
          border: `1.5px solid ${isDuplicate ? '#fde68a' : isCancelled ? '#fecaca' : '#99f6e4'}`,
          borderRadius: '12px',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: currentStage.statusColor,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${currentStage.statusColor}40`,
              flexShrink: 0,
            }}
          >
            {React.createElement(currentStage.icon, { size: 22 })}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: currentStage.statusColor,
                }}
              >
                Stage {currentIndex + 1} of 7: {currentStage.label}
              </span>
              <span
                style={{
                  background: currentStage.statusColor,
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {String(currentStatus).toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {currentStage.description}
            </div>
          </div>
        </div>

        {/* Live Tracking Progress Badge */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Rescue Progress</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: currentStage.statusColor }}>
            {progressPercent}% Complete
          </div>
        </div>
      </div>

      {/* 2. STEPPER TRACK BAR */}
      <div style={{ position: 'relative', margin: '1.25rem 0.5rem 1.75rem 0.5rem' }}>
        {/* Background Grey Connector Line */}
        <div
          style={{
            position: 'absolute',
            top: '18px',
            left: '30px',
            right: '30px',
            height: '4px',
            background: '#e2e8f0',
            borderRadius: '999px',
            zIndex: 0,
          }}
        >
          {/* Active Filled Teal/Green Progress Bar */}
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #0d9488 0%, #14b8a6 50%, #10b981 100%)',
              borderRadius: '999px',
              width: `${progressPercent}%`,
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 10px rgba(13, 148, 136, 0.4)',
            }}
          />
        </div>

        {/* Step Circles */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {STAGES.map((stage, idx) => {
            const isDone = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            const isPast = idx < currentIndex;
            const isTarget = idx === targetIndex;

            return (
              <div
                key={stage.key}
                onClick={() => {
                  if (selectable && onSelectStage) {
                    onSelectStage(stage.key);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  width: '68px',
                  cursor: selectable ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                {/* Node Circle */}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isCurrent
                      ? stage.statusColor
                      : isTarget
                      ? `${stage.statusColor}18`
                      : isPast
                      ? '#0d9488'
                      : '#ffffff',
                    border: `3px solid ${
                      isCurrent
                        ? stage.statusColor
                        : isTarget
                        ? stage.statusColor
                        : isPast
                        ? '#0d9488'
                        : '#cbd5e1'
                    }`,
                    color: isDone ? '#ffffff' : isTarget ? stage.statusColor : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    boxShadow: isCurrent
                      ? `0 0 0 4px ${stage.statusColor}33, 0 4px 14px ${stage.statusColor}55`
                      : isTarget
                      ? `0 0 0 4px ${stage.statusColor}44`
                      : isPast
                      ? '0 2px 6px rgba(13, 148, 136, 0.2)'
                      : 'none',
                    transform: isCurrent || isTarget ? 'scale(1.12)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  title={`${stage.label}: ${stage.description}${selectable ? ' (Click to select)' : ''}`}
                >
                  {isPast ? (
                    <Check size={18} strokeWidth={3} />
                  ) : isCurrent ? (
                    React.createElement(stage.icon, { size: 18 })
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Stage Label */}
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: isCurrent || isTarget ? 800 : isPast ? 700 : 500,
                    color: isCurrent || isTarget
                      ? stage.statusColor
                      : isPast
                      ? '#0f172a'
                      : '#94a3b8',
                    marginTop: '8px',
                    lineHeight: 1.15,
                    transition: 'color 0.3s ease',
                  }}
                >
                  {stage.shortName}
                </span>

                {isCurrent && (
                  <span
                    style={{
                      marginTop: '3px',
                      fontSize: '0.58rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: stage.statusColor,
                      background: `${stage.statusColor}18`,
                      padding: '1px 5px',
                      borderRadius: '999px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Active
                  </span>
                )}

                {!isCurrent && isTarget && (
                  <span
                    style={{
                      marginTop: '3px',
                      fontSize: '0.58rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: stage.statusColor,
                      background: `${stage.statusColor}22`,
                      padding: '1px 5px',
                      borderRadius: '999px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Next ➜
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. DETAILED RESCUE OPERATIONS LOG (if not hidden) */}
      {!hideLogs && (
        historyLogs.length > 0 ? (
          <div
            style={{
              marginTop: '1.25rem',
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Activity size={14} color="#0d9488" /> Rescue Operations Field Log ({historyLogs.length} Events)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {historyLogs.map((h, i) => {
                const matchedStage = STAGES.find(
                  (s) => s.key === String(h.status).toUpperCase() || s.aliases.includes(String(h.status).toUpperCase())
                ) || currentStage;

                const timeAgo = formatTimeAgo(h.timestamp);

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.6rem 0.75rem',
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      borderLeft: `3.5px solid ${matchedStage.statusColor}`,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: matchedStage.statusColor,
                            background: `${matchedStage.statusColor}15`,
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {h.status}
                        </span>
                        {h.updatedBy && (
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                            by <strong>{h.updatedBy}</strong>
                          </span>
                        )}
                      </div>
                      {h.notes && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.775rem', color: '#334155', lineHeight: 1.4 }}>
                          {h.notes}
                        </p>
                      )}
                    </div>

                    {h.timestamp && (
                      <div
                        style={{
                          textAlign: 'right',
                          flexShrink: 0,
                          lineHeight: 1.2,
                        }}
                      >
                        <div style={{ color: '#0f172a', fontSize: '0.7rem', fontWeight: 700 }}>
                          {timeAgo}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Fallback informative operations notice if no logs exist yet */
          <div
            style={{
              marginTop: '0.75rem',
              background: '#f8fafc',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              border: '1px solid #e2e8f0',
              fontSize: '0.75rem',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Clock size={16} color="#94a3b8" />
            <span>
              Real-time status updates from veterinary partners and ambulances will automatically log here as the squad advances.
            </span>
          </div>
        )
      )}
    </div>
  );
}
