import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Users,
  Construction,
  MapPin,
  Building2,
  Clock,
  Flame,
  Activity,
  Navigation
} from 'lucide-react';
import CampusMap from '../components/CampusMap.jsx';
import emergencyApi from '../services/emergencyApi.js';
import { neo4jApi } from '../services/neo4jApi.js';
export default function EmergencyIntelligence() {
  const [intelligence, setIntelligence] = useState(null);
  const [roadSegments, setRoadSegments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [xmlStatus, setXmlStatus] = useState('connecting');
  const loadIntelligence = async () => {
    try {
      setLoading(true);
      setError(null);
      setXmlStatus('connecting');
      const [
        intelligenceResponse,
        roadData,
        facilityData,
        buildingData
      ] = await Promise.all([
        emergencyApi.getIntelligence(),
        neo4jApi.getRoadSegments(1500),
        neo4jApi.getFacilities(),
        neo4jApi.getBuildings(100)
      ]);
      if (!intelligenceResponse?.success) {
        throw new Error(
          intelligenceResponse?.error ||
          'Failed to load emergency intelligence.'
        );
      }
      setXmlStatus('connected');
      setIntelligence(intelligenceResponse.data);
      setRoadSegments(roadData || []);
      setFacilities(facilityData || []);
      setBuildings(buildingData || []);
      const incidents =
        intelligenceResponse.data?.incidents || [];
      if (incidents.length > 0) {
        setSelectedIncident(incidents[0]);
      } else {
        setSelectedIncident(null);
      }
    } catch (err) {
      setXmlStatus('error');
      console.error(
        '[Emergency Command Center] Error:',
        err
      );
      setError(
        err.message ||
        'Failed to load emergency intelligence.'
      );
    } finally {
      setLoading(false);
    }
  };
  const handleXmlExport = async () => {
    try {
      await emergencyApi.downloadXmlReport();
    } catch (err) {
      console.error('[XML Export] Error:', err);
      window.alert('Failed to export the XML report. Please try again.');
    }
  };

  useEffect(() => {
    loadIntelligence();
  }, []);
  if (loading) {
    return (
      <div className="loading-state-container">
        <div className="spinner"></div>
        <p>
          Loading emergency command center...
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>
              Emergency Command Center
            </h1>
            <p>
              Real-time emergency situation intelligence
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={loadIntelligence}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
        <div className="alert-error">
          <AlertTriangle size={20} />
          <div>
            <strong>
              Unable to load emergency intelligence
            </strong>
            <p>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (!intelligence) {
    return (
      <div className="loading-state-container">
        <p>
          No emergency intelligence available.
        </p>
      </div>
    );
  }
  const summary =
    intelligence.summary || {};
  const roadNetwork =
    intelligence.roadNetwork || {};
  const incidents =
    intelligence.incidents || [];
  const blockedRoads =
    roadNetwork.blockedRoads || [];
  return (
    <div className="page-container">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <div className="page-header">
        <div>
          <h1>Emergency Command Center</h1>
          <p>
            Real-time emergency situation intelligence
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '10px',
              padding: '6px 10px',
              borderRadius: '8px',
              background: xmlStatus === 'connected' ? '#ecfdf5' : xmlStatus === 'error' ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${xmlStatus === 'connected' ? '#a7f3d0' : xmlStatus === 'error' ? '#fecaca' : '#fde68a'}`,
              color: xmlStatus === 'connected' ? '#047857' : xmlStatus === 'error' ? '#b91c1c' : '#92400e',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: xmlStatus === 'connected' ? '#10b981' : xmlStatus === 'error' ? '#ef4444' : '#f59e0b'
              }}
            />
            {xmlStatus === 'connected'
              ? 'XML DATA SOURCE — CONNECTED'
              : xmlStatus === 'error'
                ? 'XML DATA SOURCE — CONNECTION ERROR'
                : 'XML DATA SOURCE — CONNECTING'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleXmlExport}
          >
            Export XML Report
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadIntelligence}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
      {/* =====================================================
          LAST UPDATED
      ====================================================== */}
      <div
        className="action-card"
        style={{ marginBottom: '16px' }}
      >
        <div className="action-card-header">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Clock size={18} />
            <span>
              Intelligence generated
            </span>
          </div>
          <span>
            {intelligence.generatedAt
              ? new Date(
                  intelligence.generatedAt
                ).toLocaleString()
              : 'Unavailable'}
          </span>
        </div>
      </div>
      {/* =====================================================
          SUMMARY METRICS
      ====================================================== */}
      <div
        className="metrics-grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          alignItems: 'stretch'
        }}
      >
        {/* Active incidents */}
        <div className="status-card">
          <div className="status-card-icon">
            <AlertTriangle size={22} />
          </div>
          <div className="status-card-info">
            <div className="status-card-value">
              {summary.activeIncidents ?? 0}
            </div>
            <div className="status-card-desc">
              Active Incidents
            </div>
          </div>
        </div>
        {/* Critical incidents */}
        <div className="status-card">
          <div className="status-card-icon">
            <ShieldAlert size={22} />
          </div>
          <div className="status-card-info">
            <div className="status-card-value">
              {summary.criticalIncidents ?? 0}
            </div>
            <div className="status-card-desc">
              Critical Incidents
            </div>
          </div>
        </div>
        {/* High priority */}
        <div className="status-card">
          <div className="status-card-icon">
            <Activity size={22} />
          </div>
          <div className="status-card-info">
            <div className="status-card-value">
              {summary.highPriorityIncidents ?? 0}
            </div>
            <div className="status-card-desc">
              High Priority
            </div>
          </div>
        </div>
        {/* Casualties */}
        <div className="status-card">
          <div className="status-card-icon">
            <Users size={22} />
          </div>
          <div className="status-card-info">
            <div className="status-card-value">
              {summary.totalCasualties ?? 0}
            </div>
            <div className="status-card-desc">
              Total Casualties
            </div>
          </div>
        </div>
        {/* Blocked roads */}
        <div className="status-card">
          <div className="status-card-icon">
            <Construction size={22} />
          </div>
          <div
            className="status-card-info"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <div
              className="status-card-value"
              style={{
                display: 'block',
                visibility: 'visible',
                minHeight: '36px',
                fontSize: '30px',
                fontWeight: 700,
                lineHeight: 1.2,
                color: '#0f172a'
              }}
            >
              {Number(summary.blockedRoads ?? roadNetwork.blockedSegments ?? 0)}
            </div>
            <div className="status-card-desc">
              Blocked Roads
            </div>
          </div>
        </div>
      </div>
      {/* =====================================================
          MAIN MAP + INCIDENT LIST
      ====================================================== */}
      <div
        className="dashboard-main-grid"
        style={{ marginTop: '16px' }}
      >
        {/* ===================================================
            MAP
        ==================================================== */}
        <div className="action-card">
          <div className="action-card-header">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <MapPin size={18} />
              <span>
                Emergency Situation Map
              </span>
            </div>
            <span>
              {roadSegments.length} road segments
            </span>
          </div>
          <CampusMap
            roadSegments={roadSegments}
            facilities={facilities}
            buildings={buildings}
            routeNodes={[]}
            incidents={incidents}
            showRoads={true}
            showFacilities={true}
            showBuildings={true}
            showIncidents={true}
            height="600px"
          />
        </div>
        {/* ===================================================
            INCIDENT LIST
        ==================================================== */}
        <div className="side-action-column">
          <div className="action-card">
            <div className="action-card-header">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ShieldAlert size={18} />
                <span>
                  Active Incidents
                </span>
              </div>
              <span>
                {incidents.length}
              </span>
            </div>
            {incidents.length === 0 ? (
              <div
                className="loading-state-container"
                style={{ padding: '30px 10px' }}
              >
                <p>
                  No active incidents.
                </p>
              </div>
            ) : (
              <div>
                {incidents.map((incident) => {
                  const isSelected =
                    selectedIncident?.incidentId ===
                    incident.incidentId;
                  return (
                    <button
                      key={incident.incidentId}
                      type="button"
                      onClick={() =>
                        setSelectedIncident(incident)
                      }
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        marginBottom: '12px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: isSelected
                          ? '2px solid var(--emergency-red)'
                          : '1px solid var(--border-color)',
                        background: isSelected
                          ? 'rgba(239, 68, 68, 0.04)'
                          : 'white'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <strong>
                            {incident.title}
                          </strong>
                          <div
                            style={{
                              fontSize: '12px',
                              marginTop: '4px',
                              opacity: 0.65
                            }}
                          >
                            {incident.incidentId}
                          </div>
                        </div>
                        <span
                          className={`severity-pill severity-${(
                            incident.severity || 'low'
                          ).toLowerCase()}`}
                        >
                          {incident.severity}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: '10px',
                          fontSize: '13px'
                        }}
                      >
                        <div>
                          {incident.type}
                        </div>
                        <div>
                          {incident.building}
                        </div>
                        <div>
                          Priority: {incident.priorityLevel}
                        </div>
                        <div>
                          Casualties: {incident.casualties}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* =====================================================
          SELECTED INCIDENT DETAILS
      ====================================================== */}
      {selectedIncident && (
        <div
          className="action-card"
          style={{ marginTop: '16px' }}
        >
          <div className="action-card-header">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ShieldAlert size={18} />
              <span>
                Selected Incident
              </span>
            </div>
            <span>
              {selectedIncident.incidentId}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '24px'
            }}
          >
            {/* =============================================
                INCIDENT INFORMATION
            ============================================== */}
            <div>
              <h2 style={{ marginTop: 0 }}>
                {selectedIncident.title}
              </h2>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '16px'
                }}
              >
                <span
                  className={`severity-pill severity-${(
                    selectedIncident.severity || 'low'
                  ).toLowerCase()}`}
                >
                  {selectedIncident.severity}
                </span>
                <span className="severity-pill">
                  Priority {selectedIncident.priorityLevel}
                </span>
                <span className="severity-pill">
                  {selectedIncident.status}
                </span>
              </div>
              <p>
                {selectedIncident.description}
              </p>
              <div
                style={{
                  display: 'grid',
                  gap: '8px',
                  marginTop: '16px'
                }}
              >
                <div>
                  <strong>Type:</strong>{' '}
                  {selectedIncident.type}
                </div>
                <div>
                  <strong>Building:</strong>{' '}
                  {selectedIncident.building}
                </div>
                <div>
                  <strong>Zone:</strong>{' '}
                  {selectedIncident.location?.zone ||
                    'Unknown'}
                </div>
                <div>
                  <strong>Coordinates:</strong>{' '}
                  {selectedIncident.location?.latitude},{' '}
                  {selectedIncident.location?.longitude}
                </div>
                <div>
                  <strong>Casualties:</strong>{' '}
                  {selectedIncident.casualties}
                </div>
                <div>
                  <strong>Reported by:</strong>{' '}
                  {selectedIncident.reportedBy}
                </div>
              </div>
              {/* Hazard tags */}
              {selectedIncident.hazardTags?.length > 0 && (
                <div style={{ marginTop: '18px' }}>
                  <strong>
                    Hazard Tags
                  </strong>
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginTop: '8px'
                    }}
                  >
                    {selectedIncident.hazardTags.map(
                      (tag) => (
                        <span
                          key={tag}
                          className="severity-pill"
                        >
                          {tag}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* =============================================
                NEO4J INTELLIGENCE
            ============================================== */}
            <div>
              <h3 style={{ marginTop: 0 }}>
                <Navigation size={18} />
                Graph Intelligence
              </h3>
              {/* Nearest RoadNode */}
              <div
                className="route-result-box"
                style={{ marginBottom: '12px' }}
              >
                <div className="route-result-header">
                  <span>
                    Nearest RoadNode
                  </span>
                </div>
                {selectedIncident.neo4j
                  ?.nearestRoadNode ? (
                  <div className="route-metrics">
                    <div className="route-metric-item">
                      <div className="route-metric-label">
                        Node ID
                      </div>
                      <div className="route-metric-val">
                        {
                          selectedIncident.neo4j
                            .nearestRoadNode.osmId
                        }
                      </div>
                    </div>
                    <div className="route-metric-item">
                      <div className="route-metric-label">
                        Distance
                      </div>
                      <div className="route-metric-val">
                        {
                          selectedIncident.neo4j
                            .nearestRoadNode
                            .distanceMeters
                        }{' '}
                        m
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>
                    No nearest RoadNode available.
                  </p>
                )}
              </div>
              {/* Nearest facility */}
              <div className="route-result-box">
                <div className="route-result-header">
                  <span>
                    Nearest Emergency Facility
                  </span>
                </div>
                {selectedIncident.neo4j
                  ?.nearestFacility ? (
                  <div>
                    <strong>
                      {
                        selectedIncident.neo4j
                          .nearestFacility.name
                      }
                    </strong>
                    <p>
                      {
                        selectedIncident.neo4j
                          .nearestFacility.facilityType
                      }
                    </p>
                  </div>
                ) : (
                  <div>
                    <strong>
                      No facility data available
                    </strong>
                    <p>
                      Neo4j currently contains no
                      emergency Facility nodes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* ===============================================
              RESPONSE UNITS
          ================================================ */}
          <div style={{ marginTop: '24px' }}>
            <h3>
              <Activity size={18} />
              Response Units
            </h3>
            {selectedIncident.responseUnits?.length ? (
              <div
                className="metrics-grid"
                style={{
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))'
                }}
              >
                {selectedIncident.responseUnits.map(
                  (unit) => (
                    <div
                      key={unit.unitId}
                      className="route-result-box"
                    >
                      <strong>
                        {unit.unitId}
                      </strong>
                      <div style={{ marginTop: '6px' }}>
                        {unit.type}
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        Status: {unit.status}
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        ETA: {unit.etaMinutes} min
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p>
                No response units assigned.
              </p>
            )}
          </div>
        </div>
      )}
      {/* =====================================================
          ROAD NETWORK INTELLIGENCE
      ====================================================== */}
      <div
        className="action-card"
        style={{ marginTop: '16px' }}
      >
        <div className="action-card-header">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Construction size={18} />
            <span>
              Road Network Intelligence
            </span>
          </div>
        </div>
        <div className="metrics-grid">
          <div className="status-card">
            <div className="status-card-icon">
              <Navigation size={22} />
            </div>
            <div className="status-card-info">
              <div className="status-card-value">
                {roadNetwork.totalSegments ??
                  roadSegments.length}
              </div>
              <div className="status-card-desc">
                Total Road Segments
              </div>
            </div>
          </div>
          <div className="status-card">
            <div className="status-card-icon">
              <Construction size={22} />
            </div>
            <div className="status-card-info">
              <div className="status-card-value">
                {roadNetwork.blockedSegments ?? 0}
              </div>
              <div className="status-card-desc">
                Blocked Segments
              </div>
            </div>
          </div>
          <div className="status-card">
            <div className="status-card-icon">
              <Building2 size={22} />
            </div>
            <div className="status-card-info">
              <div className="status-card-value">
                {buildings.length}
              </div>
              <div className="status-card-desc">
                Buildings Loaded
              </div>
            </div>
          </div>
          <div className="status-card">
            <div className="status-card-icon">
              <Flame size={22} />
            </div>
            <div className="status-card-info">
              <div className="status-card-value">
                {facilities.length}
              </div>
              <div className="status-card-desc">
                Facilities Loaded
              </div>
            </div>
          </div>
        </div>
        {/* Blocked road details */}
        <div style={{ marginTop: '20px' }}>
          <h3>
            Blocked Road Details
          </h3>
          {blockedRoads.length === 0 ? (
            <div
              className="route-result-box"
            >
              <strong>
                No blocked roads currently reported.
              </strong>
              <p>
                All currently loaded road segments
                are marked as available.
              </p>
            </div>
          ) : (
            blockedRoads.map(
              (road, index) => (
                <div
                  key={`${road.osmWayId}-${index}`}
                  className="route-result-box"
                  style={{
                    marginTop: '10px'
                  }}
                >
                  <strong>
                    {road.name || 'Unnamed Road'}
                  </strong>
                  <div style={{ marginTop: '6px' }}>
                    OSM Way ID: {road.osmWayId}
                  </div>
                  <div>
                    Type: {road.highwayType}
                  </div>
                  <div>
                    Distance: {road.distance}
                  </div>
                  <div>
                    From: {road.fromId}
                  </div>
                  <div>
                    To: {road.toId}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>
      {/* =====================================================
          PROCESSING INFORMATION
      ====================================================== */}
      <div
        style={{
          marginTop: '16px',
          marginBottom: '20px',
          fontSize: '12px',
          opacity: 0.65,
          textAlign: 'right'
        }}
      >
        Intelligence processing time:{' '}
        {intelligence.metadata?.processingTimeMs ?? 0} ms
      </div>
    </div>
  );
}
