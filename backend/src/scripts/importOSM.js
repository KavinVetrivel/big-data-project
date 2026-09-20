require('dotenv').config();
const { fetchOSMData } = require('../services/osmService');
const {
  initConstraintsAndIndexes,
  batchCreateRoadNodes,
  batchCreateRoadSegments,
  batchCreateBuildings,
  batchCreateFacilities,
  connectBuildingsToRoads,
  connectFacilitiesToRoads,
  getGraphStatus
} = require('../services/neo4jService');
const { closeDriver } = require('../config/neo4j');

// Useful highway types to import into the road network
const ACCEPTED_HIGHWAYS = new Set([
  'motorway', 'motorway_link',
  'trunk', 'trunk_link',
  'primary', 'primary_link',
  'secondary', 'secondary_link',
  'tertiary', 'tertiary_link',
  'residential',
  'service',
  'unclassified',
  'living_street',
  'pedestrian',
  'footway',
  'path',
  'cycleway',
  'track',
  'steps'
]);

/**
 * Calculates a deterministic RoadNode ID based on coordinates rounded to 7 decimals.
 * This guarantees that intersecting roads sharing the exact same physical coordinates
 * connect to the same RoadNode in Neo4j.
 */
function getRoadNodeId(lat, lon) {
  return `rn_${lat.toFixed(7)}_${lon.toFixed(7)}`;
}

/**
 * Computes the centroid/average coordinate of a geometry array.
 */
function computeCentroid(geometry = []) {
  if (!geometry || geometry.length === 0) return null;
  let sumLat = 0;
  let sumLon = 0;
  for (const pt of geometry) {
    sumLat += pt.lat;
    sumLon += pt.lon;
  }
  return {
    lat: sumLat / geometry.length,
    lon: sumLon / geometry.length
  };
}

/**
 * Calculates the Haversine distance in meters between two lat/lon coordinates.
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function runImport() {
  console.log('====================================================');
  console.log('       PSG College OSM -> Neo4j Import Pipeline     ');
  console.log('====================================================');

  const startTime = Date.now();

  try {
    // 1. Ensure constraints & indexes exist
    await initConstraintsAndIndexes();

    // 2. Fetch OSM data via Overpass API
    console.log('\n[Step 1/5] Fetching OpenStreetMap geographic data...');
    const osmResponse = await fetchOSMData();
    const elements = osmResponse.elements || [];
    console.log(`[Step 1/5] Received ${elements.length} raw OSM elements.`);

    // 3. Parse OSM elements
    console.log('\n[Step 2/5] Parsing elements into graph nodes & relationships...');
    const roadNodesMap = new Map(); // deduplicated by roadNodeId
    const roadSegments = [];
    const buildings = [];
    const facilities = [];

    for (const element of elements) {
      if (!element) continue;
      const tags = element.tags || {};

      // A. Highways / Roads
      if (tags.highway && ACCEPTED_HIGHWAYS.has(tags.highway) && Array.isArray(element.geometry)) {
        const geom = element.geometry;
        const wayId = String(element.id);
        const roadName = tags.name || tags['name:en'] || null;
        const highwayType = tags.highway;
        const oneway = tags.oneway === 'yes' || tags.oneway === '1';

        for (let i = 0; i < geom.length; i++) {
          const pt = geom[i];
          if (!pt || typeof pt.lat !== 'number' || typeof pt.lon !== 'number') continue;

          const nodeId = getRoadNodeId(pt.lat, pt.lon);
          if (!roadNodesMap.has(nodeId)) {
            roadNodesMap.set(nodeId, {
              osmId: nodeId,
              latitude: pt.lat,
              longitude: pt.lon
            });
          }

          // Connect consecutive points as a road segment
          if (i > 0) {
            const prevPt = geom[i - 1];
            const fromId = getRoadNodeId(prevPt.lat, prevPt.lon);
            const toId = nodeId;

            if (fromId !== toId) {
              const distance = haversineDistanceMeters(prevPt.lat, prevPt.lon, pt.lat, pt.lon);
              roadSegments.push({
                fromOsmId: fromId,
                toOsmId: toId,
                osmWayId: wayId,
                name: roadName,
                highwayType: highwayType,
                distance: Math.round(distance * 100) / 100,
                oneway: oneway
              });
            }
          }
        }
      }

      // B. Buildings
      if (tags.building && tags.building !== 'no') {
        let center = null;
        if (element.lat && element.lon) {
          center = { lat: element.lat, lon: element.lon };
        } else if (Array.isArray(element.geometry) && element.geometry.length > 0) {
          center = computeCentroid(element.geometry);
        }

        if (center) {
          buildings.push({
            osmId: String(element.id),
            name: tags.name || tags['name:en'] || null,
            buildingType: tags.building,
            latitude: center.lat,
            longitude: center.lon
          });
        }
      }

      // C. Emergency Facilities (hospitals, fire stations, police)
      if (['hospital', 'fire_station', 'police'].includes(tags.amenity)) {
        let coords = null;
        if (element.lat && element.lon) {
          coords = { lat: element.lat, lon: element.lon };
        } else if (Array.isArray(element.geometry) && element.geometry.length > 0) {
          coords = computeCentroid(element.geometry);
        }

        if (coords) {
          facilities.push({
            osmId: String(element.id),
            name: tags.name || tags['name:en'] || `Unnamed ${tags.amenity.replace('_', ' ')}`,
            facilityType: tags.amenity,
            latitude: coords.lat,
            longitude: coords.lon
          });
        }
      }
    }

    const roadNodesArray = Array.from(roadNodesMap.values());

    console.log(`  - Parsed RoadNodes:     ${roadNodesArray.length}`);
    console.log(`  - Parsed RoadSegments:  ${roadSegments.length}`);
    console.log(`  - Parsed Buildings:     ${buildings.length}`);
    console.log(`  - Parsed Facilities:    ${facilities.length}`);

    // 4. Batch insert into Neo4j
    console.log('\n[Step 3/5] Inserting RoadNodes into Neo4j...');
    const insertedNodes = await batchCreateRoadNodes(roadNodesArray, 1000);
    console.log(`  ✓ Inserted/Updated ${insertedNodes} RoadNodes.`);

    console.log('\n[Step 4/5] Inserting RoadSegments (CONNECTED_TO) into Neo4j...');
    const insertedSegments = await batchCreateRoadSegments(roadSegments, 1000);
    console.log(`  ✓ Inserted/Updated ${insertedSegments} RoadSegments.`);

    console.log('\n[Step 4/5 - Cont.] Inserting Buildings and Facilities into Neo4j...');
    const insertedBuildings = await batchCreateBuildings(buildings, 500);
    console.log(`  ✓ Inserted/Updated ${insertedBuildings} Buildings.`);

    const insertedFacilities = await batchCreateFacilities(facilities, 500);
    console.log(`  ✓ Inserted/Updated ${insertedFacilities} Facilities.`);

    // 5. Connect Buildings and Facilities to Road Network
    console.log('\n[Step 5/5] Spatial linking of Buildings & Facilities to RoadNodes...');
    await connectBuildingsToRoads();
    await connectFacilitiesToRoads();

    // 6. Verify final graph counts
    const status = await getGraphStatus();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n================ Import Finished ===================');
    console.log(`Execution Time:          ${duration}s`);
    console.log(`Neo4j RoadNode Count:    ${status.roadNodes}`);
    console.log(`Neo4j Building Count:    ${status.buildings}`);
    console.log(`Neo4j Facility Count:    ${status.facilities}`);
    console.log(`Neo4j CONNECTED_TO Count:${status.connectedTo}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n[Import Error]:', err);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

runImport();
