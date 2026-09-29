const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    recipientRole: {
      type: String,
      enum: ['all', 'citizen', 'driver', 'authority', 'ngo', 'admin'],
      default: 'all',
    },
    type: {
      type: String,
      enum: [
        'NEW_REPORT',
        'HOTSPOT_CREATED',
        'HOTSPOT_UPDATED',
        'DRIVER_ALERT',
        'RESCUE_REQUESTED',
        'RESCUE_ASSIGNED',
        'RESCUE_STATUS_UPDATED',
        'AUTHORITY_ACTION_UPDATED',
        'SYSTEM_INFO'
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccidentReport',
    },
    relatedHotspotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotspot',
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Object,
      default: {},
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ isDemo: 1 });

module.exports = mongoose.model('Notification', notificationSchema);

