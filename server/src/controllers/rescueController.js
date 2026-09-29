const RescueRequest = require('../models/RescueRequest');
const AccidentReport = require('../models/AccidentReport');
const { dispatchNotification } = require('../services/notificationService');

// @desc    Get all rescue requests
// @route   GET /api/rescue
// @access  Public (NGO / Authority / Admin)
const getRescueRequests = async (req, res, next) => {
  try {
    const { status, priority } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    if (priority && priority !== 'All') {
      query.priority = { $regex: new RegExp(`^${priority}$`, 'i') };
    }

    const requests = await RescueRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('reportId')
      .populate('ngoId', 'name organization phone');

    res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single rescue request by ID
// @route   GET /api/rescue/:id
// @access  Public
const getRescueRequestById = async (req, res, next) => {
  try {
    const request = await RescueRequest.findById(req.params.id)
      .populate({
        path: 'reportId',
        populate: { path: 'hotspotId' },
      })
      .populate('ngoId', 'name organization phone email');

    if (!request) {
      return res.status(404).json({ message: 'Rescue request not found' });
    }

    res.json({ success: true, request });
  } catch (error) {
    next(error);
  }
};

// @desc    Update rescue workflow status
// @route   PATCH /api/rescue/:id/status
// @access  Private (NGO / Authority / Admin)
const updateRescueStatus = async (req, res, next) => {
  try {
    const { status, notes, assignedVolunteer, volunteerPhone, shelterLocation } = req.body;
    const request = await RescueRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Rescue request not found' });
    }

    const normalizedStatus = status ? status.toUpperCase() : request.status;
    request.status = normalizedStatus;
    if (assignedVolunteer) request.assignedVolunteer = assignedVolunteer;
    if (volunteerPhone) request.volunteerPhone = volunteerPhone;
    if (shelterLocation) request.shelterLocation = shelterLocation;
    if (notes) request.medicalNotes = notes;

    const now = new Date();
    if (normalizedStatus === 'ASSIGNED') request.assignedAt = now;
    if (normalizedStatus === 'ACCEPTED') request.acceptedAt = now;
    if (normalizedStatus === 'ON THE WAY' || normalizedStatus === 'ANIMAL REACHED') request.reachedAt = now;
    if (normalizedStatus === 'RESCUED') request.rescuedAt = now;
    if (normalizedStatus === 'COMPLETED') request.completedAt = now;

    const updatedBy = req.user ? `${req.user.name} (${req.user.role})` : 'Rescue Volunteer';

    request.statusHistory.push({
      status: normalizedStatus,
      updatedBy,
      notes: notes || `Status updated to ${normalizedStatus}`,
      timestamp: now,
    });

    await request.save();

    // Also update the linked AccidentReport status
    const report = await AccidentReport.findById(request.reportId);
    if (report) {
      report.status = normalizedStatus;
      await report.save();
    }

    // Dispatch notification to reporting citizen and stakeholders
    let notificationTitle = `🐾 Rescue Update: ${normalizedStatus}`;
    let notificationMessage = `Rescue team update: Case ${report?.reportId || ''} is now ${normalizedStatus}.`;

    if (normalizedStatus === 'ACCEPTED') {
      notificationTitle = `🐾 Rescue Accepted`;
      notificationMessage = `Your animal accident report ${report?.reportId || ''} has been accepted by a rescue organization and team dispatch is underway.`;
    } else if (normalizedStatus === 'ON THE WAY') {
      notificationTitle = `🚑 Rescue Squad En Route`;
      notificationMessage = `Rescue squad is on the way to the accident scene for report ${report?.reportId || ''}.`;
    } else if (normalizedStatus === 'RESCUED') {
      notificationTitle = `❤️ Animal Safely Rescued`;
      notificationMessage = `The injured animal for report ${report?.reportId || ''} has been safely rescued and is receiving veterinary care.`;
    }

    await dispatchNotification({
      recipientRole: 'all',
      type: 'RESCUE_STATUS_UPDATED',
      title: notificationTitle,
      message: notificationMessage,
      relatedReportId: request.reportId,
    });

    const { broadcastEvent } = require('../config/socket');
    broadcastEvent('RESCUE_STATUS_CHANGED', {
      requestId: request._id,
      request,
      status: normalizedStatus,
      reportId: request.reportId,
    });

    res.json({
      success: true,
      message: `Rescue status updated to ${normalizedStatus}`,
      request,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign volunteer/NGO to rescue
// @route   POST /api/rescue/:id/assign
// @access  Private (NGO / Authority / Admin)
const assignVolunteer = async (req, res, next) => {
  try {
    const { assignedVolunteer, volunteerPhone, ngoName } = req.body;
    const request = await RescueRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Rescue request not found' });
    }

    request.assignedVolunteer = assignedVolunteer || 'Dispatched Volunteer';
    request.volunteerPhone = volunteerPhone || '';
    if (ngoName) request.ngoName = ngoName;
    request.status = 'ASSIGNED';
    request.assignedAt = new Date();

    request.statusHistory.push({
      status: 'ASSIGNED',
      updatedBy: req.user ? req.user.name : 'NGO Coordinator',
      notes: `Volunteer ${request.assignedVolunteer} assigned to this emergency.`,
      timestamp: new Date(),
    });

    await request.save();

    // Sync report status
    const report = await AccidentReport.findByIdAndUpdate(
      request.reportId,
      { status: 'ASSIGNED' },
      { new: true }
    );

    await dispatchNotification({
      recipientRole: 'all',
      type: 'RESCUE_ASSIGNED',
      title: `🐾 Volunteer Assigned: ${request.assignedVolunteer}`,
      message: `Rescue squad assigned for case ${report?.reportId || ''}.`,
      relatedReportId: request.reportId,
    });

    const { broadcastEvent } = require('../config/socket');
    broadcastEvent('RESCUE_STATUS_CHANGED', {
      requestId: request._id,
      request,
      status: 'ASSIGNED',
      reportId: request.reportId,
    });

    res.json({ success: true, request });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRescueRequests,
  getRescueRequestById,
  updateRescueStatus,
  assignVolunteer,
};

