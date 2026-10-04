const AccidentReport = require('../models/AccidentReport');
const { calculateDistance } = require('./geoService');
const { DUPLICATE_CHECK_RADIUS_METERS, DUPLICATE_CHECK_HOURS } = require('../config/constants');
const { findVisualDuplicateAnimalReport, computeImageFingerprint } = require('./imageSimilarityService');

/**
 * Check if a similar accident report was recently submitted nearby or has matching animal photos
 */
async function checkForDuplicateReport(latitude, longitude, animalType, isDemo = false, imageOptions = {}) {
  const { fileBuffer = null, originalFilename = '', imageUrl = '', clientFingerprint = null } = imageOptions;

  // 1. TIER 1: Check for visual duplicate animal images via AI
  if (fileBuffer || originalFilename || imageUrl || clientFingerprint) {
    try {
      const visualCheck = await findVisualDuplicateAnimalReport({
        fileBuffer,
        originalFilename,
        imageUrl,
        latitude,
        longitude,
        animalType,
        isDemo,
        clientFingerprint,
        maxAgeHours: null,
      });

      if (visualCheck.isDuplicate && visualCheck.matchingReport) {
        return {
          isDuplicate: true,
          isImageDuplicate: true,
          similarityScore: visualCheck.similarityScore,
          reason: visualCheck.reason,
          distanceMeters: visualCheck.matchingReport.distanceMeters,
          existingReport: visualCheck.matchingReport,
          fingerprint: visualCheck.fingerprint,
        };
      }
    } catch (err) {
      console.warn('Visual duplicate check error:', err.message);
    }
  }

  // 2. TIER 2: Geographic & temporal proximity check
  const cutoffTime = new Date(Date.now() - DUPLICATE_CHECK_HOURS * 60 * 60 * 1000);

  const recentReports = await AccidentReport.find({
    createdAt: { $gte: cutoffTime },
    status: { $nin: ['Completed', 'Closed', 'COMPLETED', 'RESOLVED'] },
  }).lean();

  if (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
    for (const report of recentReports) {
      const distance = calculateDistance(
        latitude,
        longitude,
        report.latitude,
        report.longitude
      );

      if (distance <= DUPLICATE_CHECK_RADIUS_METERS) {
        return {
          isDuplicate: true,
          isImageDuplicate: false,
          distanceMeters: distance,
          similarityScore: 0.75,
          reason: `Co-located accident report submitted ${Math.round(distance)}m away within recent window`,
          existingReport: {
            reportId: report.reportId,
            _id: report._id,
            animalType: report.animalType,
            description: report.description,
            status: report.status,
            createdAt: report.createdAt,
            imageUrl: report.imageUrl,
            address: report.address,
          },
        };
      }
    }
  }

  return { isDuplicate: false };
}

module.exports = {
  checkForDuplicateReport,
};
