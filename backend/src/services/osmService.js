const axios = require('axios');
require('dotenv').config();

const DEFAULT_OVERPASS_URL = process.env.OSM_OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

// Fallback public Overpass API mirrors in case the primary instance is rate-limited or busy
const FALLBACK_MIRRORS = [
  DEFAULT_OVERPASS_URL,
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

/**
 * Builds the Overpass QL query string for the specified bounding box.
 * 
 * @param {number|string} south 
 * @param {number|string} west 
 * @param {number|string} north 
 * @param {number|string} east 
 * @returns {string} Overpass QL string
 */
function buildOverpassQuery(south, west, north, east) {
  const bbox = `${south},${west},${north},${east}`;
  return `
[out:json][timeout:30];
(
  way["highway"](${bbox});
  way["building"](${bbox});
  node["amenity"~"hospital|fire_station|police"](${bbox});
  way["amenity"~"hospital|fire_station|police"](${bbox});
);
out body geom;
`;
}

/**
 * Fetches OpenStreetMap data for a given bounding box from the Overpass API.
 * 
 * @param {Object} bbox
 * @param {number} bbox.south
 * @param {number} bbox.west
 * @param {number} bbox.north
 * @param {number} bbox.east
 * @returns {Promise<Object>} The parsed JSON data from Overpass containing elements array
 */
async function fetchOSMData(bbox = {}) {
  const south = bbox.south !== undefined ? bbox.south : parseFloat(process.env.OSM_SOUTH || '11.0220');
  const west = bbox.west !== undefined ? bbox.west : parseFloat(process.env.OSM_WEST || '77.0000');
  const north = bbox.north !== undefined ? bbox.north : parseFloat(process.env.OSM_NORTH || '11.0285');
  const east = bbox.east !== undefined ? bbox.east : parseFloat(process.env.OSM_EAST || '77.0060');

  if (isNaN(south) || isNaN(west) || isNaN(north) || isNaN(east)) {
    throw new Error('Invalid bounding box coordinates. Please provide valid south, west, north, and east values.');
  }

  const query = buildOverpassQuery(south, west, north, east);
  const userAgent = 'PSGCollegeEmergencyResponseNetwork/1.0 (contact: admin@psgtech.edu)';

  let lastError = null;

  // Attempt request with primary URL and fallback mirrors if needed
  for (const endpointUrl of FALLBACK_MIRRORS) {
    try {
      console.log(`[OSM Service] Querying Overpass API at: ${endpointUrl}`);
      console.log(`[OSM Service] Bounding Box: [S: ${south}, W: ${west}, N: ${north}, E: ${east}]`);

      const response = await axios.post(
        endpointUrl,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': userAgent,
            'Accept': 'application/json'
          },
          timeout: 35000
        }
      );

      if (!response.data || !Array.isArray(response.data.elements)) {
        throw new Error('Malformed response from Overpass API (missing elements array).');
      }

      console.log(`[OSM Service] Successfully received ${response.data.elements.length} elements from ${endpointUrl}`);
      return response.data;
    } catch (error) {
      const status = error.response ? error.response.status : error.code || 'UNKNOWN';
      const statusText = error.response ? error.response.statusText : error.message;
      console.warn(`[OSM Service] Warning: Request to ${endpointUrl} failed (${status}: ${statusText}). Trying mirror if available...`);
      lastError = error;
    }
  }

  throw new Error(`Overpass API request failed across all endpoints: ${lastError?.message || 'Unknown network error'}`);
}

module.exports = {
  fetchOSMData,
  buildOverpassQuery
};
