const AccidentReport = require('../models/AccidentReport');
const Hotspot = require('../models/Hotspot');
const { runDBSCAN } = require('./dbscanService');
const { calculateCentroid, calculateHotspotRadius, calculateDistance } = require('./geoService');
const { HOTSPOT_RISK, HOTSPOT_THRESHOLDS, DBSCAN_CONFIG } = require('../config/constants');

/**
 * Determine risk level based on report count
 */
function determineRiskLevel(count) {
  if (count >= HOTSPOT_THRESHOLDS.HIGH) return HOTSPOT_RISK.HIGH;
  if (count >= HOTSPOT_THRESHOLDS.MEDIUM) return HOTSPOT_RISK.MEDIUM;
  return HOTSPOT_RISK.LOW;
}

/**
 * Calculate animal breakdown from a list of reports
 */
function getAnimalDistribution(reports) {
  const dist = { Dog: 0, Cat: 0, Cattle: 0, Other: 0 };
  reports.forEach((r) => {
    const type = r.animalType || 'Other';
    dist[type] = (dist[type] || 0) + 1;
  });
  return dist;
}


/**
 * Calculate citizen-reported causes breakdown and top suspected cause
 */
function getCausesDistribution(reports) {
  const countMap = {};
  let totalReportCount = reports.length || 1;

  reports.forEach((r) => {
    const causes = Array.isArray(r.possibleCauses) && r.possibleCauses.length > 0
      ? r.possibleCauses
      : [r.rootCause || 'Poor street lighting'];

    causes.forEach((c) => {
      const trimmed = c.trim();
      if (trimmed) {
        countMap[trimmed] = (countMap[trimmed] || 0) + 1;
      }
    });
  });

  const causesBreakdown = {};
  let topCause = 'Poor street lighting';
  let maxCount = -1;

  Object.entries(countMap).forEach(([cause, cnt]) => {
    const pct = Math.round((cnt / totalReportCount) * 100);
    causesBreakdown[cause] = { count: cnt, percentage: pct };
    if (cnt > maxCount) {
      maxCount = cnt;
      topCause = cause;
    }
  });

  return { causesBreakdown, mostFrequentCause: topCause };
}

/**
 * Recalculate accident hotspots from historical reports
 */
async function recalculateHotspots(options = {}) {
  const epsilon = options.epsilon || DBSCAN_CONFIG.EPSILON_METERS;
  const minPts = options.minPts || DBSCAN_CONFIG.MIN_POINTS;

  console.log(`🔄 Starting DBSCAN Hotspot Analysis (Eps: ${epsilon}m, MinPts: ${minPts})...`);

  // 1. Fetch accident reports
  const query = {};
  const reports = await AccidentReport.find(query).lean();
  if (!reports || reports.length === 0) {
    console.log(`ℹ️ No accident reports found for clustering.`);
    await Hotspot.updateMany({}, { $set: { status: 'Archived' } });
    return { created: 0, updated: 0, clusters: 0, noise: 0, activeHotspots: [] };
  }

  // 2. Run DBSCAN on coordinate points
  const clusteringResult = runDBSCAN(reports, epsilon, minPts);
  const { clusters, noise } = clusteringResult;

  console.log(`📊 DBSCAN identified ${clusters.length} clusters and ${noise.length} noise/isolated reports.`);

  // 3. Mark noise reports in database
  if (noise.length > 0) {
    const noiseIds = noise.map((n) => n._id);
    await AccidentReport.updateMany(
      { _id: { $in: noiseIds } },
      { $set: { isNoise: true, hotspotId: null } }
    );
  }

  // 4. Match and update/create hotspots
  const savedHotspots = [];
  const existingHotspots = await Hotspot.find(query);

  for (let i = 0; i < clusters.length; i++) {
    const clusterReports = clusters[i];
    const centroid = calculateCentroid(clusterReports);
    const radius = calculateHotspotRadius(centroid, clusterReports);
    const reportCount = clusterReports.length;
    const riskLevel = determineRiskLevel(reportCount);
    const animalDist = getAnimalDistribution(clusterReports);
    const { causesBreakdown, mostFrequentCause } = getCausesDistribution(clusterReports);

    // Timestamps
    const dates = clusterReports.map((r) => new Date(r.createdAt || Date.now()).getTime());
    const firstDetected = new Date(Math.min(...dates));
    const lastAccident = new Date(Math.max(...dates));

    // Name generation based on location
    const sampleAddress = clusterReports.find((r) => r.address && r.address.length > 5)?.address || 'Accident Prone Corridor';
    const cleanName = `${sampleAddress.split(',')[0]} Cluster Zone`;

    // Check if there is an existing hotspot near this centroid (within 350m)
    let matchedHotspot = existingHotspots.find((eh) => {
      const dist = calculateDistance(
        centroid.latitude,
        centroid.longitude,
        eh.centerLatitude,
        eh.centerLongitude
      );
      return dist <= 350;
    });

    const reportObjectIds = clusterReports.map((r) => r._id);
    const clusterIsDemo = clusterReports.some((r) => r.isDemo);

    if (matchedHotspot) {
      matchedHotspot.centerLatitude = centroid.latitude;
      matchedHotspot.centerLongitude = centroid.longitude;
      matchedHotspot.radius = radius;
      matchedHotspot.reportCount = reportCount;
      matchedHotspot.riskLevel = riskLevel;
      matchedHotspot.animalDistribution = animalDist;
      matchedHotspot.causesBreakdown = causesBreakdown;
      matchedHotspot.mostFrequentCause = mostFrequentCause;
      matchedHotspot.lastAccident = lastAccident;
      matchedHotspot.reportIds = reportObjectIds;
      matchedHotspot.status = 'Active';
      matchedHotspot.isDemo = clusterIsDemo;
      await matchedHotspot.save();
      savedHotspots.push(matchedHotspot);

      // Link reports to this hotspot
      await AccidentReport.updateMany(
        { _id: { $in: reportObjectIds } },
        { $set: { hotspotId: matchedHotspot._id, isNoise: false } }
      );
    } else {
      const newHotspotId = `HS-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}-${Math.floor(100 + Math.random() * 900)}`;
      const newHotspot = await Hotspot.create({
        hotspotId: newHotspotId,
        name: cleanName,
        centerLatitude: centroid.latitude,
        centerLongitude: centroid.longitude,
        radius,
        reportCount,
        riskLevel,
        animalDistribution: animalDist,
        causesBreakdown,
        mostFrequentCause,
        firstDetected,
        lastAccident,
        status: 'Active',
        isDemo: clusterIsDemo,
        reportIds: reportObjectIds,
      });
      savedHotspots.push(newHotspot);

      // Link reports to newly created hotspot
      await AccidentReport.updateMany(
        { _id: { $in: reportObjectIds } },
        { $set: { hotspotId: newHotspot._id, isNoise: false } }
      );
    }
  }

  // Deactivate orphaned hotspots in this scope that no longer have clusters
  const activeIds = savedHotspots.map((h) => h._id.toString());
  for (const eh of existingHotspots) {
    if (!activeIds.includes(eh._id.toString())) {
      eh.status = 'Archived';
      await eh.save();
    }
  }

  console.log(`✅ Hotspot analysis complete: ${savedHotspots.length} active hotspots.`);

  return {
    success: true,
    totalReports: reports.length,
    clustersFound: clusters.length,
    noiseReports: noise.length,
    activeHotspots: savedHotspots,
  };
}

module.exports = {
  recalculateHotspots,
  determineRiskLevel,
  getCausesDistribution,
};

