require('dotenv').config();
const { fetchOSMData } = require('../services/osmService');

async function main() {
  console.log('====================================================');
  console.log('       PSG College OSM Overpass API Test Script     ');
  console.log('====================================================');

  const south = process.env.OSM_SOUTH;
  const west = process.env.OSM_WEST;
  const north = process.env.OSM_NORTH;
  const east = process.env.OSM_EAST;

  console.log(`Configured Bounding Box:`);
  console.log(`  OSM_SOUTH: ${south}`);
  console.log(`  OSM_WEST:  ${west}`);
  console.log(`  OSM_NORTH: ${north}`);
  console.log(`  OSM_EAST:  ${east}`);
  console.log('----------------------------------------------------');

  try {
    const data = await fetchOSMData();
    const elements = data.elements || [];

    let highwayCount = 0;
    let buildingCount = 0;
    let hospitalCount = 0;
    let fireStationCount = 0;
    let policeCount = 0;

    const highwayTypes = {};

    elements.forEach(element => {
      const tags = element.tags || {};

      if (tags.highway) {
        highwayCount++;
        const hwType = tags.highway;
        highwayTypes[hwType] = (highwayTypes[hwType] || 0) + 1;
      }

      if (tags.building) {
        buildingCount++;
      }

      if (tags.amenity === 'hospital') {
        hospitalCount++;
      } else if (tags.amenity === 'fire_station') {
        fireStationCount++;
      } else if (tags.amenity === 'police') {
        policeCount++;
      }
    });

    console.log('\n================ Retrieval Summary ================');
    console.log(`Total OSM Elements:      ${elements.length}`);
    console.log(`Highway Elements:        ${highwayCount}`);
    console.log(`Building Elements:       ${buildingCount}`);
    console.log(`Hospital Elements:       ${hospitalCount}`);
    console.log(`Fire Station Elements:   ${fireStationCount}`);
    console.log(`Police Station Elements: ${policeCount}`);
    console.log('----------------------------------------------------');
    console.log('Highway Types Breakdown:');
    Object.entries(highwayTypes).forEach(([type, count]) => {
      console.log(`  - ${type.padEnd(16)}: ${count}`);
    });

    console.log('\n================ Sample Data =======================');
    // Sample a highway, building, and any facility
    const highwaySample = elements.find(el => el.tags?.highway);
    const buildingSample = elements.find(el => el.tags?.building);
    const facilitySample = elements.find(el => ['hospital', 'fire_station', 'police'].includes(el.tags?.amenity));

    if (highwaySample) {
      console.log('\n[Sample Highway Element]:');
      console.log(JSON.stringify({
        id: highwaySample.id,
        type: highwaySample.type,
        tags: highwaySample.tags,
        geometryPointsCount: highwaySample.geometry ? highwaySample.geometry.length : 0,
        firstPoint: highwaySample.geometry ? highwaySample.geometry[0] : null
      }, null, 2));
    }

    if (buildingSample) {
      console.log('\n[Sample Building Element]:');
      console.log(JSON.stringify({
        id: buildingSample.id,
        type: buildingSample.type,
        tags: buildingSample.tags,
        geometryPointsCount: buildingSample.geometry ? buildingSample.geometry.length : 0,
        firstPoint: buildingSample.geometry ? buildingSample.geometry[0] : null
      }, null, 2));
    }

    if (facilitySample) {
      console.log('\n[Sample Facility Element]:');
      console.log(JSON.stringify({
        id: facilitySample.id,
        type: facilitySample.type,
        tags: facilitySample.tags,
        lat: facilitySample.lat || facilitySample.geometry?.[0]?.lat,
        lon: facilitySample.lon || facilitySample.geometry?.[0]?.lon
      }, null, 2));
    } else {
      console.log('\n[Sample Facility Element]: None located within the tight campus bounding box.');
    }

    console.log('\nNOTE: No data has been inserted into Neo4j.');
    console.log('To import data into Neo4j, run: npm run import:osm\n');

  } catch (error) {
    console.error('\n[Error in testOSM script]:', error.message);
    process.exit(1);
  }
}

main();
