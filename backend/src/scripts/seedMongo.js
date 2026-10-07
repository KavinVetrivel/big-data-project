require('dotenv').config();
const mongoose = require('mongoose');
const Incident = require('../models/Incident');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_emergency';

const SEED_INCIDENTS = [
  {
    incidentId: "INC-2026-001",
    title: "Chemical Spill in Science Lab",
    type: "Chemical Hazard",
    severity: "Critical",
    priorityLevel: 5,
    building: "Chemistry Lab (Science Block)",
    location: {
      latitude: 11.0245,
      longitude: 77.0018,
      zone: "North Campus"
    },
    description: "Hydrochloric acid container leak in research lab corridor. Immediate evacuation triggered.",
    hazardTags: ["chemical", "airborne", "evacuate"],
    responseUnits: [
      { unitId: "RU-101", type: "Hazmat Team", status: "On-Scene", etaMinutes: 0 },
      { unitId: "RU-102", type: "Ambulance", status: "On-Scene", etaMinutes: 0 }
    ],
    casualties: 2,
    status: "Active",
    reportedBy: "Dr. K. Ramanathan (Chemistry Dept)",
    reportedAt: new Date(Date.now() - 35 * 60 * 1000)
  },
  {
    incidentId: "INC-2026-002",
    title: "Dual Lane Vehicle Blockage on Main Arterial",
    type: "Road Blockage",
    severity: "High",
    priorityLevel: 4,
    building: "East Access Gate (near PSG Public School)",
    location: {
      latitude: 11.0238,
      longitude: 77.0051,
      zone: "East Gate"
    },
    description: "Heavy concrete transit truck broke axle blocking dual emergency response corridor.",
    hazardTags: ["traffic", "roadblock", "towing-required"],
    responseUnits: [
      { unitId: "RU-201", type: "Campus Patrol", status: "Dispatched", etaMinutes: 4 },
      { unitId: "RU-202", type: "Heavy Tow Truck", status: "En Route", etaMinutes: 12 }
    ],
    casualties: 0,
    status: "Active",
    reportedBy: "Gate 3 Security Booth",
    reportedAt: new Date(Date.now() - 50 * 60 * 1000)
  },
  {
    incidentId: "INC-2026-003",
    title: "Workshop Student Heat Syncope",
    type: "Medical Emergency",
    severity: "Critical",
    priorityLevel: 5,
    building: "Mechanical Engineering Block",
    location: {
      latitude: 11.0252,
      longitude: 77.0031,
      zone: "Central Campus"
    },
    description: "Third year student suffered severe dehydration and collapsed near CNC machinery.",
    hazardTags: ["medical", "first-aid", "ambulance"],
    responseUnits: [
      { unitId: "RU-301", type: "PSG Hospital Ambulance", status: "On-Scene", etaMinutes: 0 },
      { unitId: "RU-302", type: "Campus First Responder", status: "On-Scene", etaMinutes: 0 }
    ],
    casualties: 1,
    status: "Active",
    reportedBy: "Workshop Supervisor",
    reportedAt: new Date(Date.now() - 18 * 60 * 1000)
  },
  {
    incidentId: "INC-2026-004",
    title: "Server Room Electrical Sparks",
    type: "Fire",
    severity: "High",
    priorityLevel: 4,
    building: "Computer Science Dept (Block F)",
    location: {
      latitude: 11.0260,
      longitude: 77.0025,
      zone: "North Campus"
    },
    description: "UPS battery overheat triggered fire alarm and dry-powder suppression system.",
    hazardTags: ["electrical", "fire", "smoke"],
    responseUnits: [
      { unitId: "RU-401", type: "Fire Engine", status: "En Route", etaMinutes: 3 }
    ],
    casualties: 0,
    status: "Investigating",
    reportedBy: "Network Admin",
    reportedAt: new Date(Date.now() - 75 * 60 * 1000)
  },
  {
    incidentId: "INC-2026-005",
    title: "Heavy Monsoon Waterlogging at Pedestrian Underpass",
    type: "Flooding",
    severity: "Medium",
    priorityLevel: 3,
    building: "Hostel Zone Underpass",
    location: {
      latitude: 11.0275,
      longitude: 77.0040,
      zone: "Hostel Zone"
    },
    description: "Stormwater pump failure resulted in 45cm water accumulation restricting student movement.",
    hazardTags: ["weather", "flooding", "waterlogging", "pedestrian-blocked"],
    responseUnits: [
      { unitId: "RU-501", type: "Drainage Maintenance Crew", status: "Dispatched", etaMinutes: 8 }
    ],
    casualties: 0,
    status: "Active",
    reportedBy: "Hostel Warden",
    reportedAt: new Date(Date.now() - 110 * 60 * 1000)
  },
  {
    incidentId: "INC-2026-006",
    title: "Unidentified Bag Left Unattended",
    type: "Security Threat",
    severity: "Low",
    priorityLevel: 2,
    building: "Library Block Foyer",
    location: {
      latitude: 11.0255,
      longitude: 77.0038,
      zone: "Central Campus"
    },
    description: "Large black duffel bag left unattended for over 4 hours outside reading room.",
    hazardTags: ["security", "suspicious", "investigation"],
    responseUnits: [
      { unitId: "RU-601", type: "Campus Patrol", status: "On-Scene", etaMinutes: 0 }
    ],
    casualties: 0,
    status: "Resolved",
    reportedBy: "Assistant Librarian",
    reportedAt: new Date(Date.now() - 180 * 60 * 1000)
  },
  {
    incidentId: "INC-2026-007",
    title: "Transformer Oil Overheating",
    type: "Fire",
    severity: "Critical",
    priorityLevel: 5,
    building: "High Tension Substation Yard",
    location: {
      latitude: 11.0240,
      longitude: 77.0010,
      zone: "North Campus"
    },
    description: "Substation breaker tripped with black smoke and high oil temperature alert.",
    hazardTags: ["fire", "electrical", "high-voltage", "evacuate"],
    responseUnits: [
      { unitId: "RU-701", type: "Fire Engine", status: "En Route", etaMinutes: 5 },
      { unitId: "RU-702", type: "TNEB Maintenance Unit", status: "Dispatched", etaMinutes: 15 }
    ],
    casualties: 0,
    status: "Active",
    reportedBy: "Substation Operator",
    reportedAt: new Date(Date.now() - 12 * 60 * 1000)
  },
  {
    incidentId: "INC-2026-008",
    title: "Stairwell Handrail Collapse",
    type: "Medical Emergency",
    severity: "Medium",
    priorityLevel: 3,
    building: "Civil Engineering Annex",
    location: {
      latitude: 11.0268,
      longitude: 77.0015,
      zone: "North Campus"
    },
    description: "Staff member sprained ankle following loose stair banister.",
    hazardTags: ["medical", "infrastructure"],
    responseUnits: [
      { unitId: "RU-801", type: "Campus First Responder", status: "On-Scene", etaMinutes: 0 }
    ],
    casualties: 1,
    status: "Resolved",
    reportedBy: "Civil Dept Office",
    reportedAt: new Date(Date.now() - 300 * 60 * 1000)
  }
];

async function seedMongoDB(shouldDisconnect = false) {
  console.log(`[MongoDB Seed] Ensuring connection to ${mongoUri}...`);
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log('[MongoDB Seed] Connected successfully.');
  }

  // Clear existing incidents to ensure idempotent clean seed
  const deleted = await Incident.deleteMany({});
  console.log(`[MongoDB Seed] Cleared ${deleted.deletedCount} old documents from 'incidents' collection.`);

  // Insert mock incidents using insertMany (Slide 37, 42)
  const inserted = await Incident.insertMany(SEED_INCIDENTS);
  console.log(`[MongoDB Seed] Successfully inserted ${inserted.length} rich incident documents!`);

  if (shouldDisconnect) {
    await mongoose.disconnect();
    console.log('[MongoDB Seed] Connection closed.');
  }
  return inserted;
}

if (require.main === module) {
  seedMongoDB(true).catch(err => {
    console.error(`[MongoDB Seed] Error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { seedMongoDB, SEED_INCIDENTS };
