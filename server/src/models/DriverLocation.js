const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    driverName: {
      type: String,
      default: 'Active Driver',
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    heading: {
      type: Number,
      default: 0,
    },
    speed: {
      type: Number,
      default: 0,
    },
    recentAlertHotspotIds: [
      {
        hotspotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotspot' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverLocation', driverLocationSchema);
