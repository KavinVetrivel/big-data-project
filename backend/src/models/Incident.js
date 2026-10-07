const mongoose = require('mongoose');

const responseUnitSchema = new mongoose.Schema({
  unitId: { type: String, required: true },
  type: { type: String, required: true }, // e.g., 'Ambulance', 'Fire Engine', 'Campus Patrol', 'Medical Team'
  status: { type: String, enum: ['Dispatched', 'En Route', 'On-Scene', 'Available'], default: 'Dispatched' },
  etaMinutes: { type: Number, required: true, default: 5 }
}, { _id: false });

const incidentSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['Medical Emergency', 'Fire', 'Chemical Hazard', 'Road Blockage', 'Flooding', 'Security Threat'],
    required: true
  },
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    required: true
  },
  priorityLevel: { type: Number, required: true, min: 1, max: 5 }, // 1 (lowest) to 5 (highest)
  building: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    zone: { type: String, required: true } // e.g., 'North Campus', 'Central Campus', 'Hostel Zone', 'East Gate'
  },
  description: { type: String, required: true },
  hazardTags: [{ type: String }], // Array for $all, $elemMatch, $size queries
  responseUnits: [responseUnitSchema], // Array of embedded subdocuments
  casualties: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Active', 'Investigating', 'Resolved'],
    default: 'Active'
  },
  reportedBy: { type: String, default: 'Campus Security Control Room' },
  reportedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'incidents'
});

// Create index for nested location.zone and priorityLevel
incidentSchema.index({ 'location.zone': 1 });
incidentSchema.index({ priorityLevel: -1 });

const Incident = mongoose.model('Incident', incidentSchema);

module.exports = Incident;
