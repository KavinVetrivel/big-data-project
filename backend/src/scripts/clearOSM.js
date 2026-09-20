require('dotenv').config();
const { clearOSMData, getGraphStatus } = require('../services/neo4jService');
const { closeDriver } = require('../config/neo4j');

async function runClear() {
  console.log('====================================================');
  console.log('       PSG College OSM Graph Cleanup Script         ');
  console.log('====================================================');

  try {
    const before = await getGraphStatus();
    console.log('Current Graph Status:');
    console.log(`  RoadNodes:    ${before.roadNodes}`);
    console.log(`  Buildings:    ${before.buildings}`);
    console.log(`  Facilities:   ${before.facilities}`);
    console.log(`  CONNECTED_TO: ${before.connectedTo}`);
    console.log('----------------------------------------------------');

    await clearOSMData();

    const after = await getGraphStatus();
    console.log('\nGraph Status After Cleanup:');
    console.log(`  RoadNodes:    ${after.roadNodes}`);
    console.log(`  Buildings:    ${after.buildings}`);
    console.log(`  Facilities:   ${after.facilities}`);
    console.log(`  CONNECTED_TO: ${after.connectedTo}`);
    console.log('====================================================');
    console.log('OSM graph data cleared successfully.\n');
  } catch (err) {
    console.error('[Clear Error]:', err.message);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

runClear();
