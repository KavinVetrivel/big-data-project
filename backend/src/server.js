require('dotenv').config();
const express = require('express');
const { driver } = require('./config/neo4j');
const {
  getGraphStatus,
  getRoads,
  getRoadSegments,
  getFacilities,
  getBuildings,
  findShortestRoute,
  findNearestFacility,
  setRoadBlockedStatus
} = require('./services/neo4jService');

const { connectMongoDB } = require('./config/mongo');
const mongoRoutes = require('./routes/mongoRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectMongoDB();

app.use(express.json());

// Enable CORS for frontend clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/api/mongo', mongoRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    project: 'PSG College of Technology Emergency Response & Safe-Route Network',
    status: 'online',
    endpoints: [
      'GET /api/neo4j/test',
      'GET /api/osm/status',
      'GET /api/neo4j/roads?limit=50',
      'GET /api/neo4j/facilities',
      'GET /api/neo4j/buildings?limit=50',
      'GET /api/neo4j/route?from=<roadNodeId>&to=<roadNodeId>&avoidBlocked=true',
      'GET /api/neo4j/nearest-facility?lat=<latitude>&lon=<longitude>&type=<hospital|fire_station|police>',
      'POST /api/neo4j/roads/block',
      'GET /api/mongo/status',
      'POST /api/mongo/seed',
      'GET /api/mongo/query/projection',
      'GET /api/mongo/query/comparison',
      'GET /api/mongo/query/and',
      'GET /api/mongo/query/or',
      'GET /api/mongo/query/nested',
      'GET /api/mongo/query/array-all',
      'GET /api/mongo/query/elem-match',
      'GET /api/mongo/query/array-size',
      'GET /api/mongo/query/sort-pagination',
      'GET /api/mongo/query/aggregation'
    ]
  });
});

/**
 * 1. Neo4j Connection Test Endpoint
 * GET /api/neo4j/test
 */
app.get('/api/neo4j/test', async (req, res) => {
  try {
    const serverInfo = await driver.getServerInfo();
    res.json({
      success: true,
      message: 'Successfully connected to Neo4j database.',
      server: {
        address: serverInfo.address,
        agent: serverInfo.agent,
        protocolVersion: serverInfo.protocolVersion
      }
    });
  } catch (error) {
    console.error('Neo4j connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to Neo4j database.',
      error: error.message
    });
  }
});

/**
 * 2. OSM Graph Status Endpoint
 * GET /api/osm/status
 */
app.get('/api/osm/status', async (req, res) => {
  try {
    const status = await getGraphStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching graph status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 3. Road Nodes Sample Endpoint
 * GET /api/neo4j/roads?limit=100
 */
app.get('/api/neo4j/roads', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const roads = await getRoads(limit);
    res.json({
      success: true,
      count: roads.length,
      data: roads
    });
  } catch (error) {
    console.error('Error fetching roads:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 3b. Road Network Segments Endpoint (for Leaflet line rendering)
 * GET /api/neo4j/road-segments?limit=1500
 */
app.get('/api/neo4j/road-segments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '1500', 10);
    const segments = await getRoadSegments(limit);
    res.json({
      success: true,
      count: segments.length,
      data: segments
    });
  } catch (error) {
    console.error('Error fetching road segments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 4. Emergency Facilities Endpoint
 * GET /api/neo4j/facilities
 */
app.get('/api/neo4j/facilities', async (req, res) => {
  try {
    const facilities = await getFacilities();
    res.json({
      success: true,
      count: facilities.length,
      data: facilities
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 5. Buildings Endpoint
 * GET /api/neo4j/buildings?limit=50
 */
app.get('/api/neo4j/buildings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const buildings = await getBuildings(limit);
    res.json({
      success: true,
      count: buildings.length,
      data: buildings
    });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 6. Shortest Route Query Endpoint
 * GET /api/neo4j/route?from=<roadNodeId>&to=<roadNodeId>&avoidBlocked=true
 */
app.get('/api/neo4j/route', async (req, res) => {
  const { from, to, avoidBlocked } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      error: 'Missing required query parameters: "from" and "to" (RoadNode osmIds).'
    });
  }

  try {
    const shouldAvoidBlocked = avoidBlocked !== 'false';
    const route = await findShortestRoute(from, to, shouldAvoidBlocked);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: `No path found between ${from} and ${to} within search depth (or active roads are blocked).`
      });
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error('Error finding shortest route:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 7. Nearest Facility to Coordinates Endpoint
 * GET /api/neo4j/nearest-facility?lat=<latitude>&lon=<longitude>&type=<hospital|fire_station|police>
 */
app.get('/api/neo4j/nearest-facility', async (req, res) => {
  const { lat, lon, type } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      error: 'Missing required query parameters: "lat" and "lon".'
    });
  }

  try {
    const nearest = await findNearestFacility(parseFloat(lat), parseFloat(lon), type);
    if (!nearest) {
      return res.status(404).json({
        success: false,
        message: 'No emergency facilities found matching the criteria.'
      });
    }

    res.json({
      success: true,
      data: nearest
    });
  } catch (error) {
    console.error('Error finding nearest facility:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 8. Emergency Simulation: Mark Road Blocked / Unblocked
 * POST /api/neo4j/roads/block
 * Body: { "osmWayId": "123456", "blocked": true }
 */
app.post('/api/neo4j/roads/block', async (req, res) => {
  const { osmWayId, blocked } = req.body;

  if (!osmWayId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameter: "osmWayId".'
    });
  }

  try {
    const isBlocked = blocked !== undefined ? Boolean(blocked) : true;
    const count = await setRoadBlockedStatus(osmWayId, isBlocked);
    res.json({
      success: true,
      message: `Updated road segment ${osmWayId}. Blocked status: ${isBlocked}`,
      updatedRelationships: count
    });
  } catch (error) {
    console.error('Error updating road blocked status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Express Server] Emergency Response Server listening on http://localhost:${PORT}`);
  console.log(`[Express Server] Test endpoint: http://localhost:${PORT}/api/neo4j/test`);
});

module.exports = app;
