import apiClient from './api';

/**
 * Neo4j Campus Graph Network API Service
 * Interacts directly with the existing Express backend endpoints.
 */

export const neo4jApi = {
  /**
   * Check connection to the Neo4j database instance.
   */
  async checkConnection() {
    const res = await apiClient.get('/neo4j/test');
    return res.data;
  },

  /**
   * Fetch graph statistics (counts of nodes, relationships, buildings, facilities).
   */
  async getGraphStatus() {
    const res = await apiClient.get('/osm/status');
    return res.data?.data || { roadNodes: 0, buildings: 0, facilities: 0, connectedTo: 0 };
  },

  /**
   * Fetch sample road nodes from the road network.
   */
  async getRoads(limit = 100) {
    const res = await apiClient.get('/neo4j/roads', { params: { limit } });
    return res.data?.data || [];
  },

  /**
   * Fetch road segments (edges) for line visualization on the Leaflet map.
   */
  async getRoadSegments(limit = 1500) {
    const res = await apiClient.get('/neo4j/road-segments', { params: { limit } });
    return res.data?.data || [];
  },

  /**
   * Fetch campus buildings with their nearest RoadNode attachments.
   */
  async getBuildings(limit = 100) {
    const res = await apiClient.get('/neo4j/buildings', { params: { limit } });
    return res.data?.data || [];
  },

  /**
   * Fetch nearby emergency facilities (Hospitals, Police, Fire Stations).
   */
  async getFacilities() {
    const res = await apiClient.get('/neo4j/facilities');
    return res.data?.data || [];
  },

  /**
   * Query the Neo4j shortest path between two RoadNode osmIds.
   * 
   * @param {string} from RoadNode osmId
   * @param {string} to RoadNode osmId
   * @param {boolean} avoidBlocked Whether to skip segments where blocked = true
   */
  async getRoute(from, to, avoidBlocked = true) {
    const res = await apiClient.get('/neo4j/route', {
      params: {
        from,
        to,
        avoidBlocked: avoidBlocked ? 'true' : 'false'
      }
    });
    return res.data?.data || null;
  },

  /**
   * Find the nearest emergency facility to specific GPS coordinates.
   */
  async getNearestFacility(lat, lon, type = null) {
    const params = { lat, lon };
    if (type) params.type = type;
    const res = await apiClient.get('/neo4j/nearest-facility', { params });
    return res.data?.data || null;
  },

  /**
   * Simulate blocking a road segment.
   */
  async setRoadBlock(osmWayId, blocked = true) {
    const res = await apiClient.post('/neo4j/roads/block', { osmWayId, blocked });
    return res.data;
  }
};
