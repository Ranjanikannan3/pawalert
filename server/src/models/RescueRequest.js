const mongoose = require('mongoose');

const rescueRequestSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccidentReport',
      required: true,
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    ngoName: {
      type: String,
      default: 'City Animal Rescue Squad',
    },
    assignedVolunteer: {
      type: String,
      default: 'Unassigned',
    },
    volunteerPhone: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'ASSIGNED',
        'ACCEPTED',
        'ON THE WAY',
        'ANIMAL REACHED',
        'RESCUED',
        'COMPLETED',
        'CANCELLED',
        // Legacy compatibility
        'Requested',
        'Assigned',
        'Accepted',
        'On the Way',
        'Animal Reached',
        'Rescued',
        'Completed',
        'Cancelled'
      ],
      default: 'PENDING',
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'High',
    },
    medicalNotes: {
      type: String,
      default: '',
    },
    shelterLocation: {
      type: String,
      default: 'Central Animal Care Center',
    },
    assignedAt: {
      type: Date,
    },
    acceptedAt: {
      type: Date,
    },
    reachedAt: {
      type: Date,
    },
    rescuedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedBy: { type: String, default: 'System' },
        notes: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RescueRequest', rescueRequestSchema);
