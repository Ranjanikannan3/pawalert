module.exports = {
  ROLES: {
    CITIZEN: 'citizen',
    DRIVER: 'driver',
    AUTHORITY: 'authority',
    NGO: 'ngo',
    ADMIN: 'admin',
  },
  ANIMAL_TYPES: ['Dog', 'Cat', 'Cattle', 'Other'],
  REPORT_STATUS: {
    SUBMITTED: 'Submitted',
    AI_ANALYZED: 'AI Analyzed',
    VERIFIED: 'Verified',
    RESCUE_REQUESTED: 'Rescue Requested',
    RESCUE_ASSIGNED: 'Rescue Assigned',
    ON_THE_WAY: 'On the Way',
    RESCUED: 'Rescued',
    COMPLETED: 'Completed',
    CLOSED: 'Closed'
  },
  HOTSPOT_RISK: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH'
  },
  // Configurable thresholds
  HOTSPOT_THRESHOLDS: {
    HIGH: 10,
    MEDIUM: 5,
    LOW: 2
  },
  // DBSCAN clustering defaults (epsilon in meters, minPts)
  DBSCAN_CONFIG: {
    EPSILON_METERS: 450, // 450 meters neighborhood radius
    MIN_POINTS: 1,       // 1 or more reports immediately establish/fix a hotspot area
  },
  // Driver proximity warning radius in meters
  DRIVER_WARNING_RADIUS_METERS: 350,
  // Cooldown in milliseconds for driver alerts per hotspot (10 mins)
  DRIVER_ALERT_COOLDOWN_MS: 10 * 60 * 1000,
  // Duplicate check window (meters & hours)
  DUPLICATE_CHECK_RADIUS_METERS: 120,
  DUPLICATE_CHECK_HOURS: 24
};
