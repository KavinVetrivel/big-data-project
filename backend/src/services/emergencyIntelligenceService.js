const Incident = require('../models/Incident');

const {
  findNearestRoadNode,
  findNearestFacility,
  getRoadSegments
} = require('./neo4jService');


/**
 * Builds combined emergency intelligence using:
 *
 * MongoDB:
 *   - incidents
 *   - severity
 *   - priority
 *   - casualties
 *   - response units
 *
 * Neo4j:
 *   - nearest RoadNode
 *   - road network
 *   - blocked roads
 *   - nearest emergency facility
 */
async function getEmergencyIntelligence() {
  const startTime = Date.now();

  /*
   * ---------------------------------------------------------
   * 1. GET ACTIVE INCIDENTS FROM MONGODB
   * ---------------------------------------------------------
   */

  const incidents = await Incident.find({
    status: { $in: ['Active', 'Investigating'] }
  })
    .sort({
      priorityLevel: -1,
      reportedAt: -1
    })
    .lean();


  /*
   * ---------------------------------------------------------
   * 2. GET ROAD NETWORK FROM NEO4J
   * ---------------------------------------------------------
   *
   * We only need the road segments here to calculate
   * the current blocked-road situation.
   */

  const roadSegments = await getRoadSegments(5000);

  const blockedRoads = roadSegments.filter(
    segment => segment.blocked === true
  );


  /*
   * ---------------------------------------------------------
   * 3. ENRICH EACH INCIDENT USING NEO4J
   * ---------------------------------------------------------
   */

  const enrichedIncidents = [];

  for (const incident of incidents) {

    const latitude = incident.location?.latitude;
    const longitude = incident.location?.longitude;

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number'
    ) {
      enrichedIncidents.push({
        ...incident,
        neo4j: {
          nearestRoadNode: null,
          nearestFacility: null
        }
      });

      continue;
    }


    /*
     * Find the RoadNode closest to the MongoDB incident.
     */

    const nearestRoadNode = await findNearestRoadNode(
      latitude,
      longitude
    );


    /*
     * Find the nearest emergency facility.
     *
     * This may return null because your current OSM import
     * currently contains zero Facility nodes.
     */

    const nearestFacility = await findNearestFacility(
      latitude,
      longitude
    );


    enrichedIncidents.push({
      incidentId: incident.incidentId,
      title: incident.title,
      type: incident.type,
      severity: incident.severity,
      priorityLevel: incident.priorityLevel,
      building: incident.building,
      location: incident.location,
      description: incident.description,
      hazardTags: incident.hazardTags,
      responseUnits: incident.responseUnits,
      casualties: incident.casualties,
      status: incident.status,
      reportedBy: incident.reportedBy,
      reportedAt: incident.reportedAt,
      updatedAt: incident.updatedAt,

      neo4j: {
        nearestRoadNode,
        nearestFacility
      }
    });
  }


  /*
   * ---------------------------------------------------------
   * 4. CALCULATE OVERALL EMERGENCY SUMMARY
   * ---------------------------------------------------------
   */

  const totalCasualties = enrichedIncidents.reduce(
    (sum, incident) =>
      sum + (incident.casualties || 0),
    0
  );

  const criticalIncidents = enrichedIncidents.filter(
    incident => incident.severity === 'Critical'
  );

  const highPriorityIncidents = enrichedIncidents.filter(
    incident => incident.priorityLevel >= 4
  );


  /*
   * ---------------------------------------------------------
   * 5. BUILD FINAL INTELLIGENCE OBJECT
   * ---------------------------------------------------------
   */

  return {
    generatedAt: new Date().toISOString(),

    summary: {
      activeIncidents: enrichedIncidents.length,
      criticalIncidents: criticalIncidents.length,
      highPriorityIncidents: highPriorityIncidents.length,
      totalCasualties,
      blockedRoads: blockedRoads.length
    },

    roadNetwork: {
      totalSegments: roadSegments.length,
      blockedSegments: blockedRoads.length,

      blockedRoads: blockedRoads.map(segment => ({
        osmWayId: segment.osmWayId,
        name: segment.name,
        highwayType: segment.highwayType,
        distance: segment.distance,
        fromId: segment.fromId,
        toId: segment.toId
      }))
    },

    incidents: enrichedIncidents,

    metadata: {
      mongoSource: 'incidents collection',
      neo4jSource: 'RoadNode / CONNECTED_TO / Facility graph',
      processingTimeMs: Date.now() - startTime
    }
  };
}


module.exports = {
  getEmergencyIntelligence
};