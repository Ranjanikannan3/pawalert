const fs = require('fs');
const path = require('path');
const AuthorityAction = require('../models/AuthorityAction');
const Hotspot = require('../models/Hotspot');
const AccidentReport = require('../models/AccidentReport');
const { dispatchNotification } = require('../services/notificationService');

/**
 * Helper to persist base64 data URLs to uploads directory
 */
function saveBase64Image(dataString, prefix = 'proof') {
  if (!dataString || typeof dataString !== 'string' || !dataString.startsWith('data:image')) {
    return dataString;
  }
  try {
    const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataString;

    const ext = matches[1].includes('png') ? 'png' : matches[1].includes('webp') ? 'webp' : 'jpg';
    const buffer = Buffer.from(matches[2], 'base64');
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e5)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Error saving base64 image:', err.message);
    return dataString;
  }
}

// @desc    Get aggregated citizen-reported causes and problem analysis
// @route   GET /api/authority/cause-analysis
// @access  Public (Authority/Admin/Citizen)
const getCauseAnalysis = async (req, res, next) => {
  try {
    const reports = await AccidentReport.find({}).lean();
    const totalReports = reports.length;

    if (totalReports === 0) {
      const emptyPayload = {
        totalReports: 0,
        totalReportsWithCauses: 0,
        causes: [],
        distribution: [],
        topCause: 'None recorded',
        areaAnalysis: [],
        animalBreakdown: {},
      };
      return res.json({
        success: true,
        data: emptyPayload,
        ...emptyPayload,
      });
    }

    const causeCounts = {};
    const animalCounts = {};
    const areaMap = {};

    reports.forEach((r) => {
      // Animal
      const animal = r.animalType || 'Other';
      animalCounts[animal] = (animalCounts[animal] || 0) + 1;

      // Causes
      const causes = Array.isArray(r.possibleCauses) && r.possibleCauses.length > 0
        ? r.possibleCauses
        : [r.rootCause || 'Poor street lighting'];

      causes.forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) {
          causeCounts[trimmed] = (causeCounts[trimmed] || 0) + 1;
        }
      });

      // Area
      const area = r.address ? r.address.split(',')[0] : 'General Area';
      if (!areaMap[area]) {
        areaMap[area] = { area, reportCount: 0, causes: {}, primaryAnimal: animal };
      }
      areaMap[area].reportCount++;
      causes.forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) {
          areaMap[area].causes[trimmed] = (areaMap[area].causes[trimmed] || 0) + 1;
        }
      });
    });

    // Format causes array sorted by frequency
    const causes = Object.entries(causeCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalReports) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const topCause = causes.length > 0 ? causes[0].name : 'Poor street lighting';

    // Format area problem breakdown
    const areaAnalysis = Object.values(areaMap).map((a) => {
      const topAreaCause = Object.entries(a.causes).sort((x, y) => y[1] - x[1])[0]?.[0] || 'Unknown';
      const causeList = Object.entries(a.causes)
        .map(([cName, cCount]) => ({
          name: cName,
          count: cCount,
          percentage: Math.round((cCount / a.reportCount) * 100),
        }))
        .sort((x, y) => y.count - x.count);

      return {
        area: a.area,
        reportCount: a.reportCount,
        primaryAnimal: a.primaryAnimal,
        primaryCause: topAreaCause,
        causes: causeList,
      };
    }).sort((a, b) => b.reportCount - a.reportCount);

    const distribution = causes.map((c) => ({
      cause: c.name,
      count: c.count,
      percentage: c.percentage,
    }));

    const payload = {
      totalReports,
      totalReportsWithCauses: totalReports,
      causes,
      distribution,
      topCause,
      areaAnalysis,
      animalBreakdown: animalCounts,
    };

    res.json({
      success: true,
      data: payload,
      ...payload,
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get all authority actions
// @route   GET /api/authority/actions
// @access  Public (Authority/Admin)
const getAuthorityActions = async (req, res, next) => {
  try {
    const { status, priority, hotspotId, reportId } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    if (priority && priority !== 'All') {
      query.priority = { $regex: new RegExp(`^${priority}$`, 'i') };
    }
    if (hotspotId) {
      query.hotspotId = hotspotId;
    }
    if (reportId) {
      query.reportId = reportId;
    }

    const actions = await AuthorityAction.find(query)
      .sort({ createdAt: -1 })
      .populate('hotspotId', 'hotspotId name riskLevel centerLatitude centerLongitude radius reportCount mostFrequentCause causesBreakdown')
      .populate('reportId', 'reportId animalType address rootCause possibleCauses citizenObservation imageUrl citizenName remediationStatus');

    res.json({
      success: true,
      count: actions.length,
      actions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new authority action for a hotspot or specific accident report
// @route   POST /api/authority/actions
// @access  Private (Authority/Admin)
const createAuthorityAction = async (req, res, next) => {
  try {
    let {
      hotspotId,
      reportId,
      targetArea,
      problem = 'Repeated animal accidents in hazardous zone',
      possibleCause = 'Poor street lighting',
      actionType = 'Improve street lighting',
      description,
      assignedDepartment = 'Traffic Safety & Municipal Engineering',
      assignedOfficer = 'Traffic Safety Engineering Squad',
      priority = 'HIGH',
      dueDate,
      notes = '',
      beforeImageUrl = '',
      solvedImageUrl = '',
      solvedLatitude = null,
      solvedLongitude = null,
      solvedGpsAccuracy = null,
      solvedAddress = '',
      solvedNotes = '',
    } = req.body;

    if (!actionType || !description) {
      return res.status(400).json({
        message: 'Action type and description are required',
      });
    }

    if (req.file) {
      solvedImageUrl = `/uploads/${req.file.filename}`;
    }

    // Persist any base64 snapshots captured via camera
    beforeImageUrl = saveBase64Image(beforeImageUrl, 'proof-before');
    solvedImageUrl = saveBase64Image(solvedImageUrl, 'proof-after');

    const isDemoUser = req.user ? Boolean(req.user.isDemoAccount) : false;

    let hotspotName = targetArea || 'Municipal Corridor';
    if (hotspotId) {
      const hotspot = await Hotspot.findById(hotspotId);
      if (hotspot) {
        hotspotName = hotspot.name;
      }
    }

    const isCompleted = (req.body.status && req.body.status.toUpperCase() === 'COMPLETED') || Boolean(solvedImageUrl);

    const action = await AuthorityAction.create({
      hotspotId: hotspotId || null,
      reportId: reportId || null,
      targetArea: targetArea || hotspotName,
      problem,
      possibleCause,
      authorityId: req.user ? req.user._id : null,
      authorityName: req.user ? req.user.name : 'Municipal Safety Division',
      actionType,
      description,
      assignedDepartment,
      assignedOfficer,
      priority: priority.toUpperCase(),
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes,
      beforeImageUrl: beforeImageUrl || '',
      solvedImageUrl: solvedImageUrl || '',
      solvedLatitude: solvedLatitude ? parseFloat(solvedLatitude) : null,
      solvedLongitude: solvedLongitude ? parseFloat(solvedLongitude) : null,
      solvedGpsAccuracy: solvedGpsAccuracy ? parseFloat(solvedGpsAccuracy) : null,
      solvedAddress: solvedAddress || '',
      solvedNotes,
      status: isCompleted ? 'COMPLETED' : 'PENDING',
      completedDate: isCompleted ? new Date() : undefined,
      isDemo: false,
    });

    // If linked to hotspot, push action ID
    if (hotspotId) {
      await Hotspot.findByIdAndUpdate(hotspotId, {
        $push: { authorityActionIds: action._id },
      });
    }

    // If linked to report, update report remediation status and reference
    if (reportId) {
      await AccidentReport.findByIdAndUpdate(reportId, {
        remediationStatus: isCompleted ? 'COMPLETED' : 'PENDING',
        remediationActionId: action._id,
        ...(isCompleted ? { status: 'RESOLVED' } : {}),
      });
    }

    // Dispatch real-time notification to citizens & stakeholders
    await dispatchNotification({
      recipientRole: 'all',
      type: 'AUTHORITY_ACTION_UPDATED',
      title: `🛠️ Action Created: ${actionType}`,
      message: `Municipal Authority has assigned action for ${targetArea || hotspotName}: "${description}" to resolve "${possibleCause}".`,
      relatedHotspotId: hotspotId || null,
      relatedReportId: reportId || null,
    });

    const { broadcastEvent } = require('../config/socket');
    broadcastEvent('AUTHORITY_ACTION_LOGGED', { action });

    res.status(201).json({
      success: true,
      message: 'Authority action logged successfully',
      action,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update authority action status & upload solved proof photo (with Before/After & Live GPS)
// @route   PATCH /api/authority/actions/:id
// @access  Private (Authority/Admin)
const updateAuthorityAction = async (req, res, next) => {
  try {
    let {
      status,
      notes,
      assignedOfficer,
      assignedDepartment,
      beforeImageUrl,
      solvedImageUrl,
      solvedLatitude,
      solvedLongitude,
      solvedGpsAccuracy,
      solvedAddress,
      solvedNotes,
    } = req.body;
    const action = await AuthorityAction.findById(req.params.id);

    if (!action) {
      return res.status(404).json({ message: 'Action not found' });
    }

    if (req.file) {
      solvedImageUrl = `/uploads/${req.file.filename}`;
    }

    // Persist any base64 snapshots captured via camera
    beforeImageUrl = saveBase64Image(beforeImageUrl, 'proof-before');
    solvedImageUrl = saveBase64Image(solvedImageUrl, 'proof-after');

    const normalizedStatus = status ? status.toUpperCase() : action.status;

    // MANDATORY PROOF: If marking COMPLETED, solvedImageUrl must be provided
    if (normalizedStatus === 'COMPLETED' && !solvedImageUrl && !action.solvedImageUrl) {
      return res.status(400).json({
        message: 'Resolution photo proof is mandatory before marking an action as Completed.',
      });
    }

    action.status = normalizedStatus;
    if (notes !== undefined) action.notes = notes;
    if (assignedOfficer !== undefined) action.assignedOfficer = assignedOfficer;
    if (assignedDepartment !== undefined) action.assignedDepartment = assignedDepartment;
    if (beforeImageUrl) action.beforeImageUrl = beforeImageUrl;
    if (solvedImageUrl) action.solvedImageUrl = solvedImageUrl;
    if (solvedLatitude !== undefined && solvedLatitude !== null && solvedLatitude !== '') {
      action.solvedLatitude = parseFloat(solvedLatitude);
    }
    if (solvedLongitude !== undefined && solvedLongitude !== null && solvedLongitude !== '') {
      action.solvedLongitude = parseFloat(solvedLongitude);
    }
    if (solvedGpsAccuracy !== undefined && solvedGpsAccuracy !== null && solvedGpsAccuracy !== '') {
      action.solvedGpsAccuracy = parseFloat(solvedGpsAccuracy);
    }
    if (solvedAddress !== undefined) action.solvedAddress = solvedAddress;
    if (solvedNotes !== undefined) action.solvedNotes = solvedNotes;

    if (normalizedStatus === 'COMPLETED') {
      action.completedDate = new Date();
    }

    await action.save();

    // Update linked Accident Report
    if (action.reportId) {
      await AccidentReport.findByIdAndUpdate(action.reportId, {
        remediationStatus: normalizedStatus,
        remediationActionId: action._id,
        ...(normalizedStatus === 'COMPLETED' ? { status: 'RESOLVED' } : {}),
      });
    }

    // Also update all reports within linked hotspot if completed
    if (action.hotspotId && normalizedStatus === 'COMPLETED') {
      await AccidentReport.updateMany(
        { hotspotId: action.hotspotId },
        { remediationStatus: 'COMPLETED', remediationActionId: action._id }
      );
    }

    // Dispatch notifications to citizen and stakeholders
    let notificationTitle = `🛠️ Action Status: ${normalizedStatus}`;
    let notificationMessage = `Authority action for ${action.targetArea || 'the area'} updated to ${normalizedStatus}.`;

    if (normalizedStatus === 'IN_PROGRESS') {
      notificationTitle = `🚧 Work In Progress: ${action.actionType}`;
      notificationMessage = `Your reported problem near ${action.targetArea || 'the accident area'} is now being actively addressed by the concerned municipal authority.`;
    } else if (normalizedStatus === 'COMPLETED') {
      notificationTitle = `✅ Problem Resolved: ${action.actionType}`;
      notificationMessage = `Your report has been resolved. Resolution proof has been uploaded by the authority showing completed work!`;
    }

    await dispatchNotification({
      recipientRole: 'all',
      type: 'AUTHORITY_ACTION_UPDATED',
      title: notificationTitle,
      message: notificationMessage,
      relatedHotspotId: action.hotspotId || null,
      relatedReportId: action.reportId || null,
    });

    const { broadcastEvent } = require('../config/socket');
    broadcastEvent('AUTHORITY_ACTION_UPDATED', {
      actionId: action._id,
      action,
      status: normalizedStatus,
    });

    res.json({
      success: true,
      message: 'Authority action updated successfully',
      action,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCauseAnalysis,
  getAuthorityActions,
  createAuthorityAction,
  updateAuthorityAction,
};

