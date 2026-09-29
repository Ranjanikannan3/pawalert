const Hotspot = require('../models/Hotspot');
const DriverLocation = require('../models/DriverLocation');
const { getNearbyHotspots, calculateDistance } = require('../services/geoService');
const { DRIVER_ALERT_COOLDOWN_MS } = require('../config/constants');

// In-memory driver cooldown tracker for high-performance low-latency HUD queries
// Map: `${driverKey}-${hotspotId}` -> timestamp
const alertCooldownMap = new Map();

// @desc    Update driver GPS and receive instant proximity alerts
// @route   POST /api/drivers/location
// @access  Public (Driver)
const updateDriverLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, speed = 0, heading = 0, driverId, bypassCooldown = false } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const driverKey = driverId || (req.user ? req.user._id.toString() : 'guest-driver');

    // 1. Fetch active hotspots
    const activeHotspots = await Hotspot.find({ status: 'Active' }).lean();

    // 2. Compute distances to all hotspots
    const nearbyHotspots = getNearbyHotspots(lat, lng, activeHotspots, 6000); // 6km scan radius

    // 3. Check for immediate hotspot entry & alerts
    const activeAlerts = [];
    const now = Date.now();

    for (const hotspot of nearbyHotspots) {
      const warningRadius = hotspot.radius || 350;

      if (hotspot.distanceMeters <= warningRadius) {
        const cooldownKey = `${driverKey}-${hotspot._id.toString()}`;
        const lastAlertTime = alertCooldownMap.get(cooldownKey) || 0;

        // Allow immediate alert if bypassCooldown is true or 15s elapsed
        const isCooldownActive = !bypassCooldown && (now - lastAlertTime < 15000);

        if (!isCooldownActive) {
          alertCooldownMap.set(cooldownKey, now);

          activeAlerts.push({
            alertId: `ALERT-${hotspot.hotspotId}-${now}`,
            hotspotId: hotspot._id,
            hotspotCode: hotspot.hotspotId,
            hotspotName: hotspot.name,
            riskLevel: hotspot.riskLevel,
            distanceMeters: hotspot.distanceMeters,
            warningRadius,
            reportCount: hotspot.reportCount,
            animalDistribution: hotspot.animalDistribution,
            title: `🚨 ANIMAL ACCIDENT HOTSPOT AHEAD`,
            message: `Multiple animal accidents reported within ${hotspot.distanceMeters}m in this area. Please reduce speed and drive cautiously.`,
            triggeredAt: new Date(),
          });
        }
      }
    }

    // Determine current safety status
    const closestHotspot = nearbyHotspots[0] || null;
    let safetyStatus = {
      level: 'SAFE',
      message: 'No active animal accident hotspots in your immediate vicinity.',
      closestHotspot: null,
    };

    if (closestHotspot) {
      if (closestHotspot.distanceMeters <= closestHotspot.radius) {
        safetyStatus = {
          level: closestHotspot.riskLevel === 'HIGH' ? 'HIGH_RISK' : 'WARNING',
          message: `Caution! You are inside a ${closestHotspot.riskLevel} risk animal accident zone (${closestHotspot.name}).`,
          closestHotspot,
        };
      } else if (closestHotspot.distanceMeters <= 800) {
        safetyStatus = {
          level: 'CAUTION',
          message: `Approaching ${closestHotspot.riskLevel} risk zone (${closestHotspot.distanceMeters}m away).`,
          closestHotspot,
        };
      }
    }

    res.json({
      success: true,
      currentLocation: { latitude: lat, longitude: lng, speed, heading },
      safetyStatus,
      activeAlerts,
      nearbyHotspots: nearbyHotspots.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get nearby hotspots for safety HUD
// @route   GET /api/drivers/nearby-hotspots
// @access  Public
const getNearbyHotspotsForDriver = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const activeHotspots = await Hotspot.find({ status: 'Active' }).lean();

    const nearby = getNearbyHotspots(lat, lng, activeHotspots, parseFloat(radius));

    res.json({
      success: true,
      count: nearby.length,
      hotspots: nearby,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateDriverLocation,
  getNearbyHotspotsForDriver,
};
