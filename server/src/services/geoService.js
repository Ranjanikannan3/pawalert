/**
 * Geospatial utility functions using Haversine formula
 */

const EARTH_RADIUS_METERS = 6371000; // Earth radius in meters

/**
 * Calculate distance between two lat/lon coordinates in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Compute the geographic centroid (mean coordinates) of a cluster
 */
function calculateCentroid(points) {
  if (!points || points.length === 0) return { latitude: 0, longitude: 0 };
  
  let sumLat = 0;
  let sumLng = 0;
  
  points.forEach((p) => {
    sumLat += p.latitude;
    sumLng += p.longitude;
  });

  return {
    latitude: parseFloat((sumLat / points.length).toFixed(6)),
    longitude: parseFloat((sumLng / points.length).toFixed(6)),
  };
}

/**
 * Calculate the bounding radius of a cluster from its centroid
 */
function calculateHotspotRadius(center, points, minRadius = 350, buffer = 60) {
  if (!points || points.length === 0) return minRadius;
  
  let maxDist = 0;
  points.forEach((p) => {
    const dist = calculateDistance(
      center.latitude,
      center.longitude,
      p.latitude,
      p.longitude
    );
    if (dist > maxDist) maxDist = dist;
  });

  return Math.max(minRadius, Math.round(maxDist + buffer));
}

/**
 * Check if a given coordinate is within a hotspot warning radius
 */
function isInsideHotspot(driverLat, driverLng, centerLat, centerLng, radiusMeters) {
  const dist = calculateDistance(driverLat, driverLng, centerLat, centerLng);
  return {
    isInside: dist <= radiusMeters,
    distance: dist,
  };
}

/**
 * Filter and sort hotspots by proximity to a given coordinate
 */
function getNearbyHotspots(lat, lon, hotspots, maxDistanceMeters = 5000) {
  return hotspots
    .map((h) => {
      const distance = calculateDistance(
        lat,
        lon,
        h.centerLatitude,
        h.centerLongitude
      );
      return {
        ...h.toObject ? h.toObject() : h,
        distanceMeters: distance,
        isInsideWarningZone: distance <= (h.radius || 300),
      };
    })
    .filter((h) => h.distanceMeters <= maxDistanceMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

module.exports = {
  calculateDistance,
  calculateCentroid,
  calculateHotspotRadius,
  isInsideHotspot,
  getNearbyHotspots,
};
