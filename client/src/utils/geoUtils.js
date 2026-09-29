export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 99999;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return 99999;

  const R = 6371e3; // metres
  const phi1 = (numLat1 * Math.PI) / 180;
  const phi2 = (numLat2 * Math.PI) / 180;
  const deltaPhi = ((numLat2 - numLat1) * Math.PI) / 180;
  const deltaLambda = ((numLon2 - numLon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatDistance(meters) {
  if (meters === undefined || meters === null) return 'Nearby';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function getAnimalEmoji(animalType) {
  switch (animalType) {
    case 'Dog':
      return '🐕';
    case 'Cat':
      return '🐈';
    case 'Cattle':
      return '🐂';
    default:
      return '🐾';
  }
}

export function getRiskColorClass(riskLevel) {
  switch (riskLevel) {
    case 'HIGH':
      return 'badge-risk-high';
    case 'MEDIUM':
      return 'badge-risk-med';
    case 'LOW':
      return 'badge-risk-low';
    default:
      return 'badge-gray';
  }
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case 'DUPLICATE':
    case 'Duplicate':
      return 'badge-duplicate';
    case 'Rescued':
    case 'Completed':
    case 'COMPLETED':
    case 'RESCUED':
      return 'badge-risk-low';
    case 'On the Way':
    case 'ON THE WAY':
    case 'Animal Reached':
    case 'ANIMAL REACHED':
    case 'Rescue Assigned':
    case 'ASSIGNED':
    case 'ACCEPTED':
      return 'badge-teal';
    case 'Submitted':
    case 'SUBMITTED':
    case 'AI Analyzed':
    case 'Rescue Requested':
    case 'RESCUE_REQUESTED':
    case 'PENDING':
      return 'badge-risk-med';
    default:
      return 'badge-gray';
  }
}

export function getReportStage(report) {
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
}

export const REPORT_STAGE_CONFIGS = [
  { key: 'PENDING', label: 'Pending Verification', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', desc: 'Awaiting squad dispatch & initial verification' },
  { key: 'ACCEPTED', label: 'Accepted by Rescue Squad', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', desc: 'Case claimed by NGO; rescue squad dispatched' },
  { key: 'ON THE WAY', label: 'Responders En Route', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Ambulance / squad moving to incident GPS coordinates' },
  { key: 'RESCUED', label: 'Rescued & In Medical Care', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', desc: 'Animal secured, receiving veterinary triage' },
  { key: 'COMPLETED', label: 'Completed & Solved', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', desc: 'Rescue finalized and municipal hazard remediated' },
  { key: 'DUPLICATE', label: 'Duplicate / Linked Cases', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', desc: 'Synchronized with active case to avoid duplicate dispatch' },
];
