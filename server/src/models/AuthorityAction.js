const mongoose = require('mongoose');

const authorityActionSchema = new mongoose.Schema(
  {
    hotspotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotspot',
      required: false,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccidentReport',
      required: false,
    },
    targetArea: {
      type: String,
      default: '',
    },
    problem: {
      type: String,
      default: 'Frequent animal collisions',
    },
    possibleCause: {
      type: String,
      default: 'Poor street lighting',
    },
    authorityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    authorityName: {
      type: String,
      default: 'Municipal Safety Division',
    },
    actionType: {
      type: String,
      required: true,
      default: 'Improve street lighting',
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },
    assignedDepartment: {
      type: String,
      default: 'Traffic Safety Engineering Squad',
    },
    assignedOfficer: {
      type: String,
      default: 'Unassigned',
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'High', 'Medium', 'Low'],
      default: 'HIGH',
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'Pending', 'In Progress', 'Completed'],
      default: 'PENDING',
    },
    dueDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    // Resolution / Solved Proof Photos uploaded by Authority
    beforeImageUrl: {
      type: String,
      default: '',
    },
    solvedImageUrl: {
      type: String,
      default: '',
    },
    solvedLatitude: {
      type: Number,
      default: null,
    },
    solvedLongitude: {
      type: Number,
      default: null,
    },
    solvedGpsAccuracy: {
      type: Number,
      default: null,
    },
    solvedAddress: {
      type: String,
      default: '',
    },
    solvedNotes: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuthorityAction', authorityActionSchema);
