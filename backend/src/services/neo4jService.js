const neo4j = require('neo4j-driver');
const { driver, getSession } = require('../config/neo4j');

/**
 * Initializes database constraints and indexes for high-performance lookups and data integrity.
 * Compatible with Neo4j 5+ / Neo4j 2025+.
 */
async function initConstraintsAndIndexes() {
  const session = getSession();
  try {
    console.log('[Neo4j Service] Ensuring uniqueness constraints and spatial indexes...');

    // Uniqueness constraint for RoadNode.osmId
    await session.run(`
      CREATE CONSTRAINT road_node_osm_id IF NOT EXISTS
      FOR (n:RoadNode) REQUIRE n.osmId IS UNIQUE
    `);

    // Uniqueness constraint for Building.osmId
    await session.run(`
      CREATE CONSTRAINT building_osm_id IF NOT EXISTS
      FOR (b:Building) REQUIRE b.osmId IS UNIQUE
    `);

    // Uniqueness constraint for Facility.osmId
    await session.run(`
      CREATE CONSTRAINT facility_osm_id IF NOT EXISTS
      FOR (f:Facility) REQUIRE f.osmId IS UNIQUE
    `);

    // Spatial point index on RoadNode.location
    await session.run(`
      CREATE POINT INDEX road_node_location IF NOT EXISTS
      FOR (n:RoadNode) ON (n.location)
    `);

    // Spatial point index on Facility.location
    await session.run(`
      CREATE POINT INDEX facility_location IF NOT EXISTS
      FOR (f:Facility) ON (f.location)
    `);

    console.log('[Neo4j Service] Constraints and indexes verified.');
  } finally {
    await session.close();
  }
}

/**
 * Batch-creates or updates RoadNodes using UNWIND and MERGE.
 * Each node gets a spatial point property `location`.
 * 
 * @param {Array<Object>} nodes Array of { osmId, latitude, longitude }
 */
async function batchCreateRoadNodes(nodes, batchSize = 1000) {
  if (!nodes || nodes.length === 0) return 0;
  const session = getSession();
  let createdCount = 0;

  try {
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      const query = `
        UNWIND $batch AS item
        MERGE (n:RoadNode { osmId: item.osmId })
        ON CREATE SET
          n.latitude = item.latitude,
          n.longitude = item.longitude,
          n.location = point({ latitude: item.latitude, longitude: item.longitude }),
          n.source = 'OSM',
          n.createdAt = datetime()
        ON MATCH SET
          n.latitude = item.latitude,
          n.longitude = item.longitude,
          n.location = point({ latitude: item.latitude, longitude: item.longitude }),
          n.updatedAt = datetime()
      `;

      await session.run(query, { batch });
      createdCount += batch.length;
    }
    return createdCount;
  } finally {
    await session.close();
  }
}

/**
 * Batch-creates CONNECTED_TO relationships between consecutive RoadNodes.
 * Bidirectional segments are created with distance, highwayType, name, and blocked state.
 * 
 * @param {Array<Object>} segments Array of { fromOsmId, toOsmId, osmWayId, name, highwayType, distance, oneway }
 */
async function batchCreateRoadSegments(segments, batchSize = 1000) {
  if (!segments || segments.length === 0) return 0;
  const session = getSession();
  let createdCount = 0;

  try {
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);

      // Create primary direction relationship
      const queryForward = `
        UNWIND $batch AS seg
        MATCH (from:RoadNode { osmId: seg.fromOsmId })
        MATCH (to:RoadNode { osmId: seg.toOsmId })
        MERGE (from)-[r:CONNECTED_TO { osmWayId: seg.osmWayId }]->(to)
        SET
          r.name = seg.name,
          r.highwayType = seg.highwayType,
          r.distance = coalesce(seg.distance, point.distance(from.location, to.location)),
          r.blocked = coalesce(r.blocked, false),
          r.emergencyOnly = coalesce(r.emergencyOnly, false),
          r.oneway = seg.oneway,
          r.updatedAt = datetime()
      `;
      await session.run(queryForward, { batch });

      // Create reverse direction relationship if road is bidirectional
      const twoWayBatch = batch.filter(seg => !seg.oneway);
      if (twoWayBatch.length > 0) {
        const queryReverse = `
          UNWIND $batch AS seg
          MATCH (from:RoadNode { osmId: seg.toOsmId })
          MATCH (to:RoadNode { osmId: seg.fromOsmId })
          MERGE (from)-[r:CONNECTED_TO { osmWayId: seg.osmWayId }]->(to)
          SET
            r.name = seg.name,
            r.highwayType = seg.highwayType,
            r.distance = coalesce(seg.distance, point.distance(from.location, to.location)),
            r.blocked = coalesce(r.blocked, false),
            r.emergencyOnly = coalesce(r.emergencyOnly, false),
            r.oneway = false,
            r.updatedAt = datetime()
        `;
        await session.run(queryReverse, { batch: twoWayBatch });
      }

      createdCount += batch.length;
    }
    return createdCount;
  } finally {
    await session.close();
  }
}

/**
 * Batch-creates or updates Building nodes.
 * 
 * @param {Array<Object>} buildings Array of { osmId, name, buildingType, latitude, longitude }
 */
async function batchCreateBuildings(buildings, batchSize = 500) {
  if (!buildings || buildings.length === 0) return 0;
  const session = getSession();
  let createdCount = 0;

  try {
    for (let i = 0; i < buildings.length; i += batchSize) {
      const batch = buildings.slice(i, i + batchSize);
      const query = `
        UNWIND $batch AS item
        MERGE (b:Building { osmId: item.osmId })
        ON CREATE SET
          b.name = item.name,
          b.buildingType = item.buildingType,
          b.latitude = item.latitude,
          b.longitude = item.longitude,
          b.location = point({ latitude: item.latitude, longitude: item.longitude }),
          b.source = 'OSM',
          b.createdAt = datetime()
        ON MATCH SET
          b.name = coalesce(item.name, b.name),
          b.buildingType = item.buildingType,
          b.latitude = item.latitude,
          b.longitude = item.longitude,
          b.location = point({ latitude: item.latitude, longitude: item.longitude }),
          b.updatedAt = datetime()
      `;
      await session.run(query, { batch });
      createdCount += batch.length;
    }
    return createdCount;
  } finally {
    await session.close();
  }
}

/**
 * Batch-creates or updates Facility nodes (hospitals, fire stations, police).
 * 
 * @param {Array<Object>} facilities Array of { osmId, name, facilityType, latitude, longitude }
 */
async function batchCreateFacilities(facilities, batchSize = 500) {
  if (!facilities || facilities.length === 0) return 0;
  const session = getSession();
  let createdCount = 0;

  try {
    for (let i = 0; i < facilities.length; i += batchSize) {
      const batch = facilities.slice(i, i + batchSize);
      const query = `
        UNWIND $batch AS item
        MERGE (f:Facility { osmId: item.osmId })
        ON CREATE SET
          f.name = item.name,
          f.facilityType = item.facilityType,
          f.latitude = item.latitude,
          f.longitude = item.longitude,
          f.location = point({ latitude: item.latitude, longitude: item.longitude }),
          f.source = 'OSM',
          f.createdAt = datetime()
        ON MATCH SET
          f.name = coalesce(item.name, f.name),
          f.facilityType = item.facilityType,
          f.latitude = item.latitude,
          f.longitude = item.longitude,
          f.location = point({ latitude: item.latitude, longitude: item.longitude }),
          f.updatedAt = datetime()
      `;
      await session.run(query, { batch });
      createdCount += batch.length;
    }
    return createdCount;
  } finally {
    await session.close();
  }
}

/**
 * Connects Building nodes to their nearest RoadNode using spatial distance.
 * Links with (:Building)-[:NEAR { distance: ... }]->(:RoadNode).
 */
async function connectBuildingsToRoads() {
  const session = getSession();
  try {
    console.log('[Neo4j Service] Linking Buildings to nearest RoadNodes via spatial distance...');
    const query = `
      MATCH (b:Building)
      WHERE NOT (b)-[:NEAR]->(:RoadNode)
      CALL {
        WITH b
        MATCH (rn:RoadNode)
        WITH rn, point.distance(b.location, rn.location) AS dist
        ORDER BY dist ASC
        LIMIT 1
        RETURN rn AS nearestNode, dist
      }
      MERGE (b)-[r:NEAR]->(nearestNode)
      SET r.distance = dist
      RETURN count(r) AS linkedCount
    `;
    const result = await session.run(query);
    const count = result.records[0]?.get('linkedCount') || 0;
    console.log(`[Neo4j Service] Connected ${count} Buildings to RoadNodes.`);
    return count;
  } finally {
    await session.close();
  }
}

/**
 * Connects Facility nodes to their nearest RoadNode using spatial distance.
 * Links with (:Facility)-[:NEAR { distance: ... }]->(:RoadNode).
 */
async function connectFacilitiesToRoads() {
  const session = getSession();
  try {
    console.log('[Neo4j Service] Linking Facilities to nearest RoadNodes via spatial distance...');
    const query = `
      MATCH (f:Facility)
      WHERE NOT (f)-[:NEAR]->(:RoadNode)
      CALL {
        WITH f
        MATCH (rn:RoadNode)
        WITH rn, point.distance(f.location, rn.location) AS dist
        ORDER BY dist ASC
        LIMIT 1
        RETURN rn AS nearestNode, dist
      }
      MERGE (f)-[r:NEAR]->(nearestNode)
      SET r.distance = dist
      RETURN count(r) AS linkedCount
    `;
    const result = await session.run(query);
    const count = result.records[0]?.get('linkedCount') || 0;
    console.log(`[Neo4j Service] Connected ${count} Facilities to RoadNodes.`);
    return count;
  } finally {
    await session.close();
  }
}

/**
 * Safely removes all OSM-imported graph elements without affecting unrelated data.
 */
async function clearOSMData() {
  const session = getSession();
  try {
    console.log('[Neo4j Service] Clearing OSM graph data (RoadNodes, Buildings, Facilities)...');
    const query = `
      MATCH (n)
      WHERE n:RoadNode OR n:Building OR n:Facility
      DETACH DELETE n
    `;
    await session.run(query);
    console.log('[Neo4j Service] Successfully cleared OSM graph data.');
  } finally {
    await session.close();
  }
}

/**
 * Returns graph summary counts (RoadNodes, Buildings, Facilities, CONNECTED_TO).
 */
async function getGraphStatus() {
  const session = getSession();
  try {
    const query = `
      CALL {
        MATCH (rn:RoadNode) RETURN count(rn) AS roadNodes
      }
      CALL {
        MATCH (b:Building) RETURN count(b) AS buildings
      }
      CALL {
        MATCH (f:Facility) RETURN count(f) AS facilities
      }
      CALL {
        MATCH ()-[r:CONNECTED_TO]->() RETURN count(r) AS connectedTo
      }
      RETURN roadNodes, buildings, facilities, connectedTo
    `;
    const result = await session.run(query);
    if (result.records.length > 0) {
      const rec = result.records[0];
      return {
        roadNodes: rec.get('roadNodes'),
        buildings: rec.get('buildings'),
        facilities: rec.get('facilities'),
        connectedTo: rec.get('connectedTo')
      };
    }
    return { roadNodes: 0, buildings: 0, facilities: 0, connectedTo: 0 };
  } finally {
    await session.close();
  }
}

/**
 * Retrieves a sample of RoadNodes with coordinates.
 */
async function getRoads(limit = 100) {
  const session = getSession();
  try {
    const query = `
      MATCH (rn:RoadNode)
      RETURN rn.osmId AS osmId, rn.latitude AS latitude, rn.longitude AS longitude
      LIMIT $limit
    `;
    const result = await session.run(query, { limit: neo4j.int(parseInt(limit, 10)) });
    return result.records.map(rec => ({
      osmId: rec.get('osmId'),
      latitude: rec.get('latitude'),
      longitude: rec.get('longitude')
    }));
  } finally {
    await session.close();
  }
}

/**
 * Retrieves road network segments (edges) connecting pairs of RoadNodes.
 * Used by Leaflet to render the road network graph and blocked roads.
 */
async function getRoadSegments(limit = 1500) {
  const session = getSession();
  try {
    const query = `
      MATCH (a:RoadNode)-[r:CONNECTED_TO]->(b:RoadNode)
      WHERE a.osmId < b.osmId
      RETURN a.osmId AS fromId, a.latitude AS fromLat, a.longitude AS fromLon,
             b.osmId AS toId, b.latitude AS toLat, b.longitude AS toLon,
             r.osmWayId AS osmWayId, r.name AS name, r.highwayType AS highwayType,
             r.distance AS distance, coalesce(r.blocked, false) AS blocked
      LIMIT $limit
    `;
    const result = await session.run(query, { limit: neo4j.int(parseInt(limit, 10)) });
    return result.records.map(rec => ({
      fromId: rec.get('fromId'),
      fromLat: rec.get('fromLat'),
      fromLon: rec.get('fromLon'),
      toId: rec.get('toId'),
      toLat: rec.get('toLat'),
      toLon: rec.get('toLon'),
      osmWayId: rec.get('osmWayId'),
      name: rec.get('name'),
      highwayType: rec.get('highwayType'),
      distance: rec.get('distance'),
      blocked: rec.get('blocked')
    }));
  } finally {
    await session.close();
  }
}

/**
 * Retrieves emergency facilities.
 */
async function getFacilities() {
  const session = getSession();
  try {
    const query = `
      MATCH (f:Facility)
      OPTIONAL MATCH (f)-[r:NEAR]->(rn:RoadNode)
      RETURN f.osmId AS osmId,
             f.name AS name,
             f.facilityType AS facilityType,
             f.latitude AS latitude,
             f.longitude AS longitude,
             rn.osmId AS nearestRoadNodeId,
             r.distance AS distanceToRoad
      ORDER BY f.facilityType, f.name
    `;
    const result = await session.run(query);
    return result.records.map(rec => ({
      osmId: rec.get('osmId'),
      name: rec.get('name'),
      facilityType: rec.get('facilityType'),
      latitude: rec.get('latitude'),
      longitude: rec.get('longitude'),
      nearestRoadNodeId: rec.get('nearestRoadNodeId'),
      distanceToRoadMeters: rec.get('distanceToRoad')
    }));
  } finally {
    await session.close();
  }
}

/**
 * Retrieves a list of buildings.
 */
async function getBuildings(limit = 50) {
  const session = getSession();
  try {
    const query = `
      MATCH (b:Building)
      OPTIONAL MATCH (b)-[r:NEAR]->(rn:RoadNode)
      RETURN b.osmId AS osmId,
             b.name AS name,
             b.buildingType AS buildingType,
             b.latitude AS latitude,
             b.longitude AS longitude,
             rn.osmId AS nearestRoadNodeId,
             r.distance AS distanceToRoad
      LIMIT $limit
    `;
    const result = await session.run(query, { limit: neo4j.int(parseInt(limit, 10)) });
    return result.records.map(rec => ({
      osmId: rec.get('osmId'),
      name: rec.get('name'),
      buildingType: rec.get('buildingType'),
      latitude: rec.get('latitude'),
      longitude: rec.get('longitude'),
      nearestRoadNodeId: rec.get('nearestRoadNodeId'),
      distanceToRoadMeters: rec.get('distanceToRoad')
    }));
  } finally {
    await session.close();
  }
}

/**
 * Finds the shortest route between two RoadNodes using safe bounded path search.
 * Supports emergency simulation by optionally excluding blocked road segments.
 * 
 * @param {string} fromOsmId Start RoadNode osmId
 * @param {string} toOsmId End RoadNode osmId
 * @param {boolean} avoidBlocked Whether to exclude segments where blocked = true
 * @param {number} maxHops Maximum path depth (prevents runaway queries)
 */
async function findShortestRoute(fromOsmId, toOsmId, avoidBlocked = true, maxHops = 30) {
  const session = getSession();
  try {
    // Cypher query using shortestPath with a bounded relationship depth
    const query = `
      MATCH (start:RoadNode { osmId: $fromOsmId }), (dest:RoadNode { osmId: $toOsmId })
      MATCH p = shortestPath((start)-[:CONNECTED_TO*..${maxHops}]->(dest))
      WHERE NOT $avoidBlocked OR ALL(r IN relationships(p) WHERE coalesce(r.blocked, false) = false)
      RETURN
        start.osmId AS startId,
        dest.osmId AS destId,
        length(p) AS hops,
        reduce(totalDist = 0.0, r IN relationships(p) | totalDist + coalesce(r.distance, 0.0)) AS totalDistanceMeters,
        [n IN nodes(p) | { osmId: n.osmId, latitude: n.latitude, longitude: n.longitude }] AS pathNodes,
        [r IN relationships(p) | {
          osmWayId: r.osmWayId,
          name: r.name,
          highwayType: r.highwayType,
          distance: r.distance,
          blocked: r.blocked
        }] AS segments
    `;

    const result = await session.run(query, {
      fromOsmId,
      toOsmId,
      avoidBlocked: Boolean(avoidBlocked)
    });

    if (result.records.length === 0) {
      return null;
    }

    const rec = result.records[0];
    return {
      startNodeId: rec.get('startId'),
      endNodeId: rec.get('destId'),
      hops: rec.get('hops'),
      totalDistanceMeters: Math.round(rec.get('totalDistanceMeters') * 100) / 100,
      pathNodes: rec.get('pathNodes'),
      segments: rec.get('segments')
    };
  } finally {
    await session.close();
  }
}

/**
 * Finds the nearest emergency facility to a given geographic coordinate.
 * 
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {string|null} facilityType Optional filter: 'hospital', 'fire_station', 'police'
 */
async function findNearestFacility(latitude, longitude, facilityType = null) {
  const session = getSession();
  try {
    const query = `
      WITH point({ latitude: $lat, longitude: $lon }) AS originPoint
      MATCH (f:Facility)
      WHERE $facilityType IS NULL OR f.facilityType = $facilityType
      WITH f, point.distance(originPoint, f.location) AS distMeters
      ORDER BY distMeters ASC
      LIMIT 1
      RETURN
        f.osmId AS osmId,
        f.name AS name,
        f.facilityType AS facilityType,
        f.latitude AS latitude,
        f.longitude AS longitude,
        distMeters
    `;

    const result = await session.run(query, {
      lat: parseFloat(latitude),
      lon: parseFloat(longitude),
      facilityType: facilityType || null
    });

    if (result.records.length === 0) {
      return null;
    }

    const rec = result.records[0];
    return {
      osmId: rec.get('osmId'),
      name: rec.get('name'),
      facilityType: rec.get('facilityType'),
      latitude: rec.get('latitude'),
      longitude: rec.get('longitude'),
      distanceMeters: Math.round(rec.get('distMeters') * 100) / 100
    };
  } finally {
    await session.close();
  }
}

/**
 * Helper to mark a road segment as blocked or unblocked for emergency simulation.
 * 
 * @param {string} osmWayId OSM Way ID of the road to block/unblock
 * @param {boolean} blocked Status to set
 */
async function setRoadBlockedStatus(osmWayId, blocked = true) {
  const session = getSession();
  try {
    const query = `
      MATCH ()-[r:CONNECTED_TO { osmWayId: $osmWayId }]->()
      SET r.blocked = $blocked, r.updatedAt = datetime()
      RETURN count(r) AS updatedCount
    `;
    const result = await session.run(query, { osmWayId: String(osmWayId), blocked });
    return result.records[0]?.get('updatedCount') || 0;
  } finally {
    await session.close();
  }
}

module.exports = {
  initConstraintsAndIndexes,
  batchCreateRoadNodes,
  batchCreateRoadSegments,
  batchCreateBuildings,
  batchCreateFacilities,
  connectBuildingsToRoads,
  connectFacilitiesToRoads,
  clearOSMData,
  getGraphStatus,
  getRoads,
  getRoadSegments,
  getFacilities,
  getBuildings,
  findShortestRoute,
  findNearestFacility,
  setRoadBlockedStatus
};
