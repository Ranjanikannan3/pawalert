const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const AccidentReport = require('../models/AccidentReport');
const { calculateDistance } = require('./geoService');
const { DUPLICATE_CHECK_RADIUS_METERS, DUPLICATE_CHECK_HOURS } = require('../config/constants');

/**
 * Generate a robust perceptual + cryptographic fingerprint from an image buffer or URL
 */
function computeImageFingerprint(fileBuffer, originalFilename = '', imageUrl = '') {
  let sha256 = '';
  let pHash = '';

  if (fileBuffer && Buffer.isBuffer(fileBuffer) && fileBuffer.length > 0) {
    // 1. Exact cryptographic hash
    sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 2. Perceptual luminance block sampling hash (64-bit string)
    // Sample bytes evenly across the file buffer to approximate spatial frequency distribution
    const sampleCount = 64;
    const step = Math.max(1, Math.floor(fileBuffer.length / sampleCount));
    let samples = [];
    for (let i = 0; i < sampleCount; i++) {
      const idx = Math.min(fileBuffer.length - 1, i * step);
      samples.push(fileBuffer[idx]);
    }
    const avg = samples.reduce((acc, v) => acc + v, 0) / sampleCount;
    pHash = samples.map((v) => (v >= avg ? '1' : '0')).join('');
  } else {
    // If only filename or URL is available (e.g. preset demo image)
    const norm = (imageUrl || originalFilename || '').trim().toLowerCase();
    sha256 = crypto.createHash('sha256').update(norm).digest('hex');
    pHash = sha256.slice(0, 64);
  }

  const normalizedUrl = (imageUrl || originalFilename || '').trim();

  return {
    sha256,
    pHash,
    normalizedUrl,
  };
}

/**
 * Calculate visual similarity between two image fingerprints (0.0 to 1.0)
 */
function compareFingerprints(fp1, fp2) {
  if (!fp1 || !fp2) return 0;

  // 1. Exact file buffer hash match (100% identical image file)
  if (fp1.sha256 && fp2.sha256 && fp1.sha256 === fp2.sha256) {
    return 1.0;
  }

  // 2. Exact URL or preset image filename match
  if (fp1.normalizedUrl && fp2.normalizedUrl) {
    const clean1 = path.basename(fp1.normalizedUrl).toLowerCase().split('?')[0];
    const clean2 = path.basename(fp2.normalizedUrl).toLowerCase().split('?')[0];
    if (clean1 && clean2 && clean1 === clean2) {
      return 1.0;
    }
  }

  // 3. Perceptual hash Hamming similarity
  if (fp1.pHash && fp2.pHash && fp1.pHash.length === fp2.pHash.length) {
    let diff = 0;
    for (let i = 0; i < fp1.pHash.length; i++) {
      if (fp1.pHash[i] !== fp2.pHash[i]) diff++;
    }
    const similarity = 1.0 - diff / fp1.pHash.length;
    return parseFloat(similarity.toFixed(3));
  }

  return 0;
}

/**
 * Find if the uploaded animal image matches an existing accident report in recent history
 */
async function findVisualDuplicateAnimalReport({
  fileBuffer = null,
  originalFilename = '',
  imageUrl = '',
  latitude = null,
  longitude = null,
  animalType = null,
  isDemo = null,
  maxAgeHours = null,
}) {
  const currentFp = computeImageFingerprint(fileBuffer, originalFilename, imageUrl);

  // Search reports with an image without restricting by isDemo or strict 24h window
  const query = {
    $or: [
      { imageUrl: { $exists: true, $ne: '' } },
      { imageHash: { $exists: true, $ne: '' } },
    ],
  };

  const recentReports = await AccidentReport.find(query).sort({ createdAt: -1 }).limit(500).lean();

  let bestMatch = null;
  let highestSimilarity = 0;
  let matchReason = '';

  for (const report of recentReports) {
    let reportFp = null;

    // Check if the report has a stored imageHash
    if (report.imageHash) {
      try {
        reportFp = JSON.parse(report.imageHash);
      } catch (e) {
        reportFp = { sha256: report.imageHash, pHash: report.imageHash };
      }
    }

    // If report has an imageUrl pointing to local /uploads/
    if (!reportFp && report.imageUrl) {
      let localBuf = null;
      if (report.imageUrl.startsWith('/uploads/')) {
        const fullLocalPath = path.join(__dirname, '../../', report.imageUrl);
        if (fs.existsSync(fullLocalPath)) {
          try {
            localBuf = fs.readFileSync(fullLocalPath);
          } catch (e) {}
        }
      }
      reportFp = computeImageFingerprint(localBuf, '', report.imageUrl);
    }

    if (!reportFp) continue;

    const similarity = compareFingerprints(currentFp, reportFp);

    // Compute distance if coordinates are present
    let distanceMeters = null;
    if (
      latitude !== null &&
      longitude !== null &&
      report.latitude !== undefined &&
      report.longitude !== undefined
    ) {
      distanceMeters = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(report.latitude),
        parseFloat(report.longitude)
      );
    }

    // Friendly time formatting
    const elapsedMinutes = Math.max(
      1,
      Math.round((Date.now() - new Date(report.createdAt).getTime()) / 60000)
    );
    let timeAgo = `${elapsedMinutes}m ago`;
    if (elapsedMinutes >= 60 && elapsedMinutes < 1440) {
      timeAgo = `${Math.round(elapsedMinutes / 60)}h ago`;
    } else if (elapsedMinutes >= 1440) {
      timeAgo = `${Math.round(elapsedMinutes / 1440)}d ago`;
    }

    // Matching criteria:
    // A) 100% exact same photo uploaded (hash match or similarity >= 0.95)
    const isExactImageMatch = similarity >= 0.95;

    // B) High visual similarity (>= 0.85) of same animal species
    const isHighVisualMatch =
      similarity >= 0.85 && (!animalType || !report.animalType || animalType === report.animalType);

    // C) Moderate visual similarity (>= 0.70) within same accident location (<= 250m)
    const isProximityVisualMatch =
      similarity >= 0.7 &&
      distanceMeters !== null &&
      distanceMeters <= Math.max(DUPLICATE_CHECK_RADIUS_METERS || 120, 250);

    if (isExactImageMatch || isHighVisualMatch || isProximityVisualMatch) {
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;

        let reason = '';
        if (isExactImageMatch) {
          reason = `Identical animal photo matched with previous report ${report.reportId} (${timeAgo}${report.status ? ', ' + report.status : ''})`;
        } else if (isHighVisualMatch) {
          reason = `High visual similarity (${Math.round(similarity * 100)}%) with ${report.animalType} photo in report ${report.reportId} (${timeAgo})`;
        } else {
          reason = `Visual similarity (${Math.round(similarity * 100)}%) and co-located accident (${Math.round(distanceMeters)}m away) with report ${report.reportId}`;
        }

        matchReason = reason;
        bestMatch = {
          reportId: report.reportId,
          _id: report._id,
          animalType: report.animalType,
          description: report.description,
          status: report.status,
          createdAt: report.createdAt,
          elapsedMinutes,
          timeAgo,
          imageUrl: report.imageUrl,
          address: report.address,
          distanceMeters,
          similarityScore: similarity,
          matchReason,
        };
      }
    }
  }

  if (bestMatch) {
    return {
      isDuplicate: true,
      similarityScore: highestSimilarity,
      matchingReport: bestMatch,
      reason: matchReason,
      fingerprint: currentFp,
    };
  }

  return {
    isDuplicate: false,
    similarityScore: 0,
    fingerprint: currentFp,
  };
}

module.exports = {
  computeImageFingerprint,
  compareFingerprints,
  findVisualDuplicateAnimalReport,
};
