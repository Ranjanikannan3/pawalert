const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema(
  {
    hotspotId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: 'Accident Hotspot Area',
    },
    centerLatitude: {
      type: Number,
      required: true,
    },
    centerLongitude: {
      type: Number,
      required: true,
    },
    radius: {
      type: Number,
      required: true, // in meters
      default: 300,
    },
    reportCount: {
      type: Number,
      default: 1,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
    animalDistribution: {
      Dog: { type: Number, default: 0 },
      Cat: { type: Number, default: 0 },
      Cattle: { type: Number, default: 0 },
      Other: { type: Number, default: 0 },
    },
    firstDetected: {
      type: Date,
      default: Date.now,
    },
    lastAccident: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'Monitoring', 'Remediated', 'Archived'],
      default: 'Active',
    },
    mostFrequentCause: {
      type: String,
      default: 'Poor street lighting',
    },
    causesBreakdown: {
      type: Object,
      default: {},
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    reportIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AccidentReport',
      },
    ],
    authorityActionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuthorityAction',
      },
    ],
  },
  { timestamps: true }
);

hotspotSchema.index({ centerLatitude: 1, centerLongitude: 1 });
hotspotSchema.index({ isDemo: 1 });

module.exports = mongoose.model('Hotspot', hotspotSchema);

