const mongoose = require('mongoose');

const accidentReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    citizenName: {
      type: String,
      default: 'Anonymous Citizen',
    },
    citizenPhone: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      required: true,
    },
    animalType: {
      type: String,
      enum: ['Dog', 'Cat', 'Cattle', 'Other'],
      required: true,
      default: 'Dog',
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.95,
    },
    aiCorrected: {
      type: Boolean,
      default: false,
    },
    userCorrectedAnimal: {
      type: String,
      default: '',
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      default: 'Location captured via GPS',
    },
    district: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // Multi-select citizen-reported possible causes
    possibleCauses: {
      type: [String],
      default: ['Poor street lighting'],
    },
    // Free-text observations on what makes accidents happen in this area
    citizenObservation: {
      type: String,
      default: '',
      trim: true,
    },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Moderate', 'Minor', 'CRITICAL', 'HIGH', 'MODERATE', 'MINOR', 'critical', 'high', 'moderate', 'minor'],
      default: 'Moderate',
    },

    // Global workflow status
    status: {
      type: String,
      enum: [
        'PENDING',
        'SUBMITTED',
        'UNDER_REVIEW',
        'ASSIGNED',
        'ACCEPTED',
        'ON THE WAY',
        'ANIMAL REACHED',
        'RESCUE_REQUESTED',
        'RESCUE_IN_PROGRESS',
        'RESCUED',
        'AUTHORITY_REVIEW',
        'ACTION_PENDING',
        'ACTION_IN_PROGRESS',
        'RESOLVED',
        'COMPLETED',
        'CLOSED',
        'DUPLICATE',
        'Duplicate',
        // Backward-compatible legacy strings
        'Submitted',
        'AI Analyzed',
        'Verified',
        'Rescue Requested',
        'Rescue Assigned',
        'On the Way',
        'Animal Reached',
        'Rescued',
        'Completed',
        'Closed'
      ],
      default: 'PENDING',
    },

    // Duplicate detection fields
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccidentReport',
      default: null,
    },
    duplicateReportId: {
      type: String,
      default: null,
    },
    duplicateConfidence: {
      type: Number,
      default: 0,
    },
    duplicateReason: {
      type: String,
      default: '',
    },
    imageHash: {
      type: String,
      default: '',
    },

    // Municipal Authority Remediation Status
    remediationStatus: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'Pending', 'In Progress', 'Completed'],
      default: 'PENDING',
    },
    remediationActionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuthorityAction',
      default: null,
    },
    hotspotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotspot',
      default: null,
    },
    isNoise: {
      type: Boolean,
      default: false,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for geographical coordinate queries
accidentReportSchema.index({ latitude: 1, longitude: 1 });
accidentReportSchema.index({ createdAt: -1 });
accidentReportSchema.index({ isDemo: 1 });
accidentReportSchema.index({ isDuplicate: 1 });
accidentReportSchema.index({ imageHash: 1 });

module.exports = mongoose.model('AccidentReport', accidentReportSchema);
