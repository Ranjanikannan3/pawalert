const fs = require('fs');
const AccidentReport = require('../models/AccidentReport');
const RescueRequest = require('../models/RescueRequest');
const { checkForDuplicateReport } = require('../services/duplicateService');
const { computeImageFingerprint } = require('../services/imageSimilarityService');
const { recalculateHotspots } = require('../services/hotspotService');
const { dispatchNotification } = require('../services/notificationService');
const { analyzeAnimalImage } = require('../services/aiService');

// @desc    Pre-check if a similar report exists nearby or matching animal image
// @route   POST /api/reports/check-duplicate
// @access  Public
const checkDuplicate = async (req, res, next) => {
  try {
    const { latitude, longitude, animalType, imageUrl } = req.body;
    let fileBuffer = null;
    let originalFilename = '';

    if (req.file) {
      fileBuffer = fs.readFileSync(req.file.path);
      originalFilename = req.file.originalname;
    }

    const duplicateCheck = await checkForDuplicateReport(
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      animalType,
      req.user ? Boolean(req.user.isDemoAccount) : false,
      {
        fileBuffer,
        originalFilename,
        imageUrl: imageUrl || '',
      }
    );

    res.json({ success: true, ...duplicateCheck });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit an accident report
// @route   POST /api/reports
// @access  Public (Optional Citizen Auth)
const createReport = async (req, res, next) => {
  try {
    const {
      animalType = 'Dog',
      aiConfidence = 0.96,
      aiCorrected = false,
      userCorrectedAnimal = '',
      latitude,
      longitude,
      address,
      description,
      severity = 'Moderate',
      rootCause = 'Poor street lighting',
      causeDescription = '',
      possibleCauses,
      citizenObservation = '',
      citizenName,
      citizenPhone,
      bypassDuplicateCheck = false,
    } = req.body;

    if (!latitude || !longitude || !description) {
      return res.status(400).json({ message: 'Latitude, longitude, and description are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    const isDemoUser = req.user ? Boolean(req.user.isDemoAccount) : false;
    const shouldBypass = bypassDuplicateCheck === true || bypassDuplicateCheck === 'true';

    // 1. Handle image & compute visual fingerprint
    let fileBuffer = null;
    let imageUrl = '/uploads/sample-dog.jpg';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      try {
        fileBuffer = fs.readFileSync(req.file.path);
      } catch (e) {}
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    const imageFingerprint = computeImageFingerprint(
      fileBuffer,
      req.file ? req.file.originalname : '',
      imageUrl
    );

    // 1b. Validate image gatekeeper: reject human or non-animal photo
    if (!shouldBypass) {
      const origName = req.file ? req.file.originalname : (req.body.sampleType || '');
      const aiGateCheck = await analyzeAnimalImage(fileBuffer, origName, {
        imageUrl,
        isHuman: req.body.isHuman === true || req.body.isHuman === 'true',
        detectedType: req.body.detectedType,
      });

      if (aiGateCheck.isAnimal === false) {
        return res.status(400).json({
          success: false,
          status: 'INCORRECT_IMAGE_DETECTED',
          message: aiGateCheck.message || '⚠️ Incorrect Image Detected: The uploaded photo does not contain an animal.',
          aiResult: aiGateCheck,
        });
      }
    }

    // 2. AI visual duplicate & spatial proximity check
    let isReportDuplicate = false;
    let duplicateInfo = null;

    if (!shouldBypass) {
      const dupCheck = await checkForDuplicateReport(
        lat,
        lng,
        animalType,
        isDemoUser,
        {
          fileBuffer,
          originalFilename: req.file ? req.file.originalname : '',
          imageUrl,
        }
      );

      if (dupCheck.isDuplicate) {
        isReportDuplicate = true;
        duplicateInfo = dupCheck;
      }
    }

    // 3. Format possibleCauses
    let parsedCauses = ['Poor street lighting'];
    if (Array.isArray(possibleCauses)) {
      parsedCauses = possibleCauses.filter(Boolean);
    } else if (typeof possibleCauses === 'string') {
      try {
        const parsed = JSON.parse(possibleCauses);
        if (Array.isArray(parsed)) parsedCauses = parsed;
        else parsedCauses = [possibleCauses];
      } catch (e) {
        parsedCauses = possibleCauses.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (parsedCauses.length === 0 && rootCause) {
      parsedCauses = [rootCause];
    }

    // 4. Generate unique sequential Report ID
    const count = await AccidentReport.countDocuments();
    const reportId = `PA-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const reportStatus = isReportDuplicate ? 'DUPLICATE' : 'PENDING';
    const duplicateOf = isReportDuplicate && duplicateInfo?.existingReport ? duplicateInfo.existingReport._id : null;
    const duplicateReportId = isReportDuplicate && duplicateInfo?.existingReport ? duplicateInfo.existingReport.reportId : null;
    const duplicateReason = isReportDuplicate ? (duplicateInfo.reason || 'AI visual match with previous animal accident report') : '';
    const duplicateConfidence = isReportDuplicate ? (duplicateInfo.similarityScore || 0.98) : 0;

    // 5. Create Accident Report in MongoDB
    const report = await AccidentReport.create({
      reportId,
      citizenId: req.user ? req.user._id : null,
      citizenName: citizenName || (req.user ? req.user.name : 'Anonymous Citizen'),
      citizenPhone: citizenPhone || (req.user ? req.user.phone : ''),
      imageUrl,
      animalType: userCorrectedAnimal || animalType,
      aiConfidence: parseFloat(aiConfidence) || 0.96,
      aiCorrected: Boolean(aiCorrected),
      userCorrectedAnimal: userCorrectedAnimal || '',
      latitude: lat,
      longitude: lng,
      address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      description,
      possibleCauses: parsedCauses,
      citizenObservation: citizenObservation || description,
      rootCause: parsedCauses[0] || rootCause || 'Poor street lighting',
      causeDescription: causeDescription || citizenObservation || `Suspected causes: ${parsedCauses.join(', ')}`,
      severity,
      status: reportStatus,
      isDuplicate: isReportDuplicate,
      duplicateOf,
      duplicateReportId,
      duplicateReason,
      duplicateConfidence,
      imageHash: JSON.stringify(imageFingerprint),
      remediationStatus: 'PENDING',
      isDemo: isDemoUser,
    });

    // 6. Update linked Rescue Request or link to existing rescue
    if (isReportDuplicate && duplicateOf) {
      try {
        await RescueRequest.findOneAndUpdate(
          { reportId: duplicateOf },
          {
            $push: {
              statusHistory: {
                status: 'DUPLICATE_REPORT_LINKED',
                updatedBy: 'PawAlert AI Vision',
                notes: `Citizen submitted matching animal photo (${report.reportId}). Marked as duplicate and linked to this incident.`,
                timestamp: new Date(),
              },
            },
          }
        );
      } catch (err) {
        console.warn('Could not update original rescue request with duplicate note:', err.message);
      }
    }

    const rescueRequest = await RescueRequest.create({
      reportId: report._id,
      ngoName: 'Central Rescue Operations',
      priority: isReportDuplicate ? 'Low' : severity === 'Critical' ? 'Critical' : severity === 'Moderate' ? 'High' : 'Medium',
      status: isReportDuplicate ? 'CANCELLED' : 'PENDING',
      isDemo: isDemoUser,
      statusHistory: [
        {
          status: isReportDuplicate ? 'CANCELLED' : 'PENDING',
          updatedBy: report.citizenName,
          notes: isReportDuplicate
            ? `Report marked as DUPLICATE of accident ${duplicateReportId} via AI animal photo analysis. Supporting evidence linked.`
            : 'Citizen submitted accident report with GPS coordinates and photo.',
          timestamp: new Date(),
        },
      ],
    });

    // Populate reportId object for zero-latency real-time client hydration
    const populatedRescueRequest = {
      ...rescueRequest.toObject(),
      reportId: report.toObject(),
    };

    // ⚡ ZERO-LATENCY REAL-TIME BROADCAST TO ALL ACTIVE DASHBOARDS
    try {
      const { broadcastEvent } = require('../config/socket');
      broadcastEvent('NEW_REPORT_SUBMITTED', {
        report: report.toObject(),
        rescueRequest: populatedRescueRequest,
        isDuplicate: isReportDuplicate,
        duplicateReportId,
        hotspots: [],
      });
    } catch (socketErr) {
      console.error('Immediate socket broadcast warning:', socketErr.message);
    }

    // 7. Asynchronously trigger DBSCAN Hotspot Analysis & Dispatch Notifications
    setImmediate(async () => {
      try {
        const clusterResult = await recalculateHotspots();

        // Broadcast updated hotspots to GIS maps and driver proximity radar
        const { broadcastEvent } = require('../config/socket');
        broadcastEvent('HOTSPOT_RECALCULATED', {
          hotspots: clusterResult?.activeHotspots || [],
        });

        // Dispatch notifications
        if (isReportDuplicate) {
          await dispatchNotification({
            recipientRole: 'ngo',
            type: 'RESCUE_REQUESTED',
            title: `🐾 Supporting Photo for ${report.animalType} Accident (${duplicateReportId})`,
            message: `Citizen uploaded matching animal photo for active case ${duplicateReportId}. Marked as duplicate and attached to rescue notes.`,
            relatedReportId: duplicateOf || report._id,
          });

          if (req.user) {
            await dispatchNotification({
              userId: req.user._id,
              recipientRole: 'citizen',
              type: 'NEW_REPORT',
              title: `🔗 Report ${report.reportId} Marked as Duplicate`,
              message: `Your report ${report.reportId} was matched with existing case ${duplicateReportId} via AI photo vision. Your photo has been linked to the squad!`,
              relatedReportId: report._id,
            });
          }
        } else {
          // Dispatch notifications to NGO, Authority, and Citizen for new distinct incident
          await dispatchNotification({
            recipientRole: 'ngo',
            type: 'RESCUE_REQUESTED',
            title: `🐾 New ${report.animalType} Accident Reported`,
            message: `Accident report ${report.reportId} received at ${report.address}. Rescue required.`,
            relatedReportId: report._id,
          });

          await dispatchNotification({
            recipientRole: 'authority',
            type: 'NEW_REPORT',
            title: `🚨 Accident Incident Logged: ${report.reportId}`,
            message: `Contributing factors noted: ${parsedCauses.join(', ')} near ${report.address}.`,
            relatedReportId: report._id,
          });

          if (req.user) {
            await dispatchNotification({
              userId: req.user._id,
              recipientRole: 'citizen',
              type: 'NEW_REPORT',
              title: `📋 Report ${report.reportId} Submitted`,
              message: `Your report ${report.reportId} is currently pending review by rescue squads and civic authorities.`,
              relatedReportId: report._id,
            });
          }
        }
      } catch (err) {
        console.error('Async report notification & broadcast error:', err.message);
      }
    });

    res.status(201).json({
      success: true,
      isDuplicate: isReportDuplicate,
      duplicateReportId,
      duplicateReason,
      message: isReportDuplicate
        ? `Accident report submitted and marked as DUPLICATE of ${duplicateReportId} via AI animal photo analysis.`
        : 'Accident report submitted successfully',
      report,
      rescueRequest,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all accident reports with filtering
// @route   GET /api/reports
// @access  Public
const getReports = async (req, res, next) => {
  try {
    const { animalType, status, severity, search, limit = 100, page = 1 } = req.query;
    const query = {};

    if (animalType && animalType !== 'All') {
      query.animalType = animalType;
    }
    if (status && status !== 'All') {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    if (severity && severity !== 'All') {
      query.severity = severity;
    }
    if (search) {
      query.$or = [
        { reportId: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await AccidentReport.countDocuments(query);
    const reports = await AccidentReport.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('hotspotId', 'hotspotId name riskLevel radius mostFrequentCause causesBreakdown')
      .populate('duplicateOf', 'reportId animalType imageUrl address createdAt status citizenObservation')
      .populate('remediationActionId');

    const reportIds = reports.map((r) => r._id);
    const rescues = await RescueRequest.find({ reportId: { $in: reportIds } }).lean();
    const rescueMap = {};
    rescues.forEach((rescue) => {
      rescueMap[rescue.reportId.toString()] = rescue;
    });

    const populatedReports = reports.map((r) => {
      const rObj = r.toObject();
      const linkedRescue = rescueMap[r._id.toString()];
      if (linkedRescue) {
        rObj.rescue = linkedRescue;
        rObj.statusHistory = linkedRescue.statusHistory || [];
        if (linkedRescue.status && linkedRescue.status !== 'CANCELLED') {
          rObj.status = linkedRescue.status;
        }
      }
      return rObj;
    });

    res.json({
      success: true,
      total,
      page: parseInt(page),
      reports: populatedReports,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single accident report
// @route   GET /api/reports/:id
// @access  Public
const getReportById = async (req, res, next) => {
  try {
    const report = await AccidentReport.findById(req.params.id)
      .populate('hotspotId')
      .populate('citizenId', 'name email phone')
      .populate('duplicateOf', 'reportId animalType imageUrl address createdAt status citizenObservation')
      .populate('remediationActionId');

    if (!report) {
      return res.status(404).json({ message: 'Accident report not found' });
    }

    const rescue = await RescueRequest.findOne({ reportId: report._id });

    res.json({ success: true, report, rescue });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reports submitted by current citizen
// @route   GET /api/reports/my
// @access  Private (Citizen)
const getMyReports = async (req, res, next) => {
  try {
    const reports = await AccidentReport.find({ citizenId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('hotspotId')
      .populate('duplicateOf', 'reportId animalType imageUrl address createdAt status citizenObservation')
      .populate('remediationActionId');

    const reportIds = reports.map((r) => r._id);
    const rescues = await RescueRequest.find({ reportId: { $in: reportIds } }).lean();
    const rescueMap = {};
    rescues.forEach((rescue) => {
      rescueMap[rescue.reportId.toString()] = rescue;
    });

    const populatedReports = reports.map((r) => {
      const rObj = r.toObject();
      const linkedRescue = rescueMap[r._id.toString()];
      if (linkedRescue) {
        rObj.rescue = linkedRescue;
        rObj.statusHistory = linkedRescue.statusHistory || [];
        if (linkedRescue.status && linkedRescue.status !== 'CANCELLED') {
          rObj.status = linkedRescue.status;
        }
      }
      return rObj;
    });

    res.json({ success: true, reports: populatedReports });
  } catch (error) {
    next(error);
  }
};

// @desc    Update report status
// @route   PATCH /api/reports/:id/status
// @access  Private (Authority/NGO/Admin)
const updateReportStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const report = await AccidentReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = status;
    await report.save();

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  checkDuplicate,
  getReports,
  getReportById,
  getMyReports,
  updateReportStatus,
};

