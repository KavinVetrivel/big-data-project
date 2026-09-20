/**
 * Mock Incident Data for PSG College of Technology Emergency Response System
 * 
 * NOTE FOR FUTURE MONGODB INTEGRATION:
 * This data structure mirrors the planned MongoDB Incident schema:
 * {
 *   id: String,
 *   type: 'Fire' | 'Medical Emergency' | 'Road Blockage' | 'Flooding' | 'Security Issue',
 *   severity: 'Critical' | 'High' | 'Medium' | 'Low',
 *   location: { latitude: Number, longitude: Number },
 *   building: String,
 *   description: String,
 *   status: 'Active' | 'Investigating' | 'Resolved',
 *   reportedAt: String (ISO Date)
 * }
 */

export const MOCK_INCIDENTS = [
  {
    id: "INC-2026-01",
    type: "Medical Emergency",
    severity: "Critical",
    location: {
      latitude: 11.0252,
      longitude: 77.0031
    },
    building: "Mechanical Engineering Block",
    description: "Student fainted in workshop, immediate medical assistance requested.",
    status: "Active",
    reportedAt: "2026-09-20T14:45:00.000Z"
  },
  {
    id: "INC-2026-02",
    type: "Road Blockage",
    severity: "High",
    location: {
      latitude: 11.0238,
      longitude: 77.0051
    },
    building: "Campus East Gate (near PSG Public School)",
    description: "Maintenance construction vehicle blocking dual lanes on access road.",
    status: "Active",
    reportedAt: "2026-09-20T14:15:00.000Z"
  },
  {
    id: "INC-2026-03",
    type: "Fire",
    severity: "High",
    location: {
      latitude: 11.0245,
      longitude: 77.0018
    },
    building: "Chemistry Lab (Science Block)",
    description: "Minor electrical short circuit in reagent storage room; alarm sounded.",
    status: "Investigating",
    reportedAt: "2026-09-20T13:50:00.000Z"
  },
  {
    id: "INC-2026-04",
    type: "Security Issue",
    severity: "Medium",
    location: {
      latitude: 11.0261,
      longitude: 77.0042
    },
    building: "Hostel Zone 2",
    description: "Unauthorized vehicle parked blocking emergency fire tender turning point.",
    status: "Active",
    reportedAt: "2026-09-20T12:30:00.000Z"
  },
  {
    id: "INC-2026-05",
    type: "Flooding",
    severity: "Low",
    location: {
      latitude: 11.0232,
      longitude: 77.0035
    },
    building: "Sports Ground Drainage Pathway",
    description: "Water stagnation due to heavy rainfall runoff along outer pedestrian path.",
    status: "Resolved",
    reportedAt: "2026-09-20T11:00:00.000Z"
  }
];
