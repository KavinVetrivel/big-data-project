import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Network, Building2, Shield, AlertTriangle,
  GitMerge, RefreshCw, ChevronRight, MapPin
} from 'lucide-react';
import { neo4jApi } from '../services/neo4jApi';
import { MOCK_INCIDENTS } from '../data/mockIncidents';
import CampusMap from '../components/CampusMap.jsx';

export default function Dashboard() {
  const [graphStatus, setGraphStatus] = useState(null);
  const [roadSegments, setRoadSegments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRoads, setShowRoads] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [status, segments, facs] = await Promise.all([
        neo4jApi.getGraphStatus(),
        neo4jApi.getRoadSegments(1500),
        neo4jApi.getFacilities(),
      ]);
      setGraphStatus(status);
      setRoadSegments(segments);
      setFacilities(facs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const activeIncidents = MOCK_INCIDENTS.filter(i => i.status === 'Active');

  const toNumber = val => {
    if (val == null) return 0;
    if (typeof val === 'object' && val.low != null) return val.low;
    return Number(val);
  };

  return (
    <div>
      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="status-card">
          <div className="status-card-info">
            <h3>Road Nodes</h3>
            <div className="status-card-value">
              {loading ? '—' : toNumber(graphStatus?.roadNodes).toLocaleString()}
            </div>
            <div className="status-card-desc">OSM intersection nodes</div>
          </div>
          <div className="status-card-icon icon-blue"><Network size={22} /></div>
        </div>

        <div className="status-card">
          <div className="status-card-info">
            <h3>Buildings</h3>
            <div className="status-card-value">
              {loading ? '—' : toNumber(graphStatus?.buildings).toLocaleString()}
            </div>
            <div className="status-card-desc">Mapped campus structures</div>
          </div>
          <div className="status-card-icon icon-rose"><Building2 size={22} /></div>
        </div>

        <div className="status-card">
          <div className="status-card-info">
            <h3>Facilities</h3>
            <div className="status-card-value">
              {loading ? '—' : toNumber(graphStatus?.facilities).toLocaleString()}
            </div>
            <div className="status-card-desc">Emergency response points</div>
          </div>
          <div className="status-card-icon icon-indigo"><Shield size={22} /></div>
        </div>

        <div className="status-card">
          <div className="status-card-info">
            <h3>Active Incidents</h3>
            <div className="status-card-value" style={{ color: activeIncidents.length > 0 ? '#dc2626' : undefined }}>
              {activeIncidents.length}
            </div>
            <div className="status-card-desc">Requiring immediate attention</div>
          </div>
          <div className="status-card-icon icon-red"><AlertTriangle size={22} /></div>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <AlertTriangle size={16} />
          {error} — Is the backend running on port 5000?
          <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={loadData}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Main Grid: Map + Right Panel */}
      <div className="dashboard-main-grid">
        {/* Map */}
        <div className="map-container-card">
          <div className="map-header">
            <div className="map-header-title">
              <MapPin size={16} />
              PSG Tech Campus — Live Network View
            </div>
            <div className="map-controls-group">
              <button
                id="toggle-roads"
                className={`toggle-chip${showRoads ? ' active' : ''}`}
                onClick={() => setShowRoads(v => !v)}
              >
                <GitMerge size={12} /> Roads
              </button>
              <button
                id="toggle-facilities"
                className={`toggle-chip${showFacilities ? ' active' : ''}`}
                onClick={() => setShowFacilities(v => !v)}
              >
                <Shield size={12} /> Facilities
              </button>
              <button className="btn-secondary" onClick={loadData} id="refresh-map-btn">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state-container" style={{ flex: 1 }}>
              <div className="spinner" />
              <p>Loading campus network from Neo4j…</p>
            </div>
          ) : (
            <div style={{ flex: 1, position: 'relative' }}>
              <CampusMap
                roadSegments={roadSegments}
                facilities={facilities}
                incidents={MOCK_INCIDENTS}
                showRoads={showRoads}
                showFacilities={showFacilities}
                showBuildings={false}
                showIncidents={true}
                height="100%"
              />

              {/* Legend */}
              <div className="map-legend-box">
                <span className="legend-item">
                  <span className="legend-line" style={{ background: '#3b82f6' }} />
                  Road
                </span>
                <span className="legend-item">
                  <span className="legend-line" style={{ background: '#dc2626' }} />
                  Blocked
                </span>
                <span className="legend-item">
                  <span className="legend-color" style={{ background: '#be123c' }} />
                  Hospital
                </span>
                <span className="legend-item">
                  <span className="legend-color" style={{ background: '#ea580c' }} />
                  Fire Stn
                </span>
                <span className="legend-item">
                  <span className="legend-color" style={{ background: '#4338ca' }} />
                  Police
                </span>
                <span className="legend-item">
                  <span className="legend-color" style={{ background: '#dc2626', borderRadius: '50%' }} />
                  Incident
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="side-action-column">
          {/* Graph stats card */}
          <div className="action-card">
            <div className="action-card-header">
              <h2><Network size={16} /> Graph Network</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Road Connections', val: toNumber(graphStatus?.connectedTo), unit: 'edges', color: '#2563eb' },
                { label: 'Road Nodes', val: toNumber(graphStatus?.roadNodes), unit: 'nodes', color: '#4338ca' },
                { label: 'Buildings Mapped', val: toNumber(graphStatus?.buildings), unit: 'nodes', color: '#475569' },
                { label: 'Facilities', val: toNumber(graphStatus?.facilities), unit: 'nodes', color: '#be123c' },
              ].map(({ label, val, unit, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.82rem', color: '#475569' }}>{label}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color }}>
                    {loading ? '—' : val.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8' }}>{unit}</span>
                  </span>
                </div>
              ))}
            </div>
            <Link to="/map" id="explore-map-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '8px 12px', background: '#eff6ff', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
              Explore Full Map <ChevronRight size={15} />
            </Link>
          </div>

          {/* Active Incidents card */}
          <div className="action-card">
            <div className="action-card-header">
              <h2><AlertTriangle size={16} /> Active Incidents</h2>
              <Link to="/incidents" style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>View all</Link>
            </div>
            {activeIncidents.length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>No active incidents</p>
            ) : (
              activeIncidents.map(inc => (
                <div key={inc.id} className="incident-card">
                  <div className="incident-header">
                    <span className="incident-title">{inc.type}</span>
                    <span className={`severity-pill severity-${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                  </div>
                  <p className="incident-meta">{inc.building}</p>
                </div>
              ))
            )}
          </div>

          {/* Quick actions */}
          <div className="action-card">
            <div className="action-card-header">
              <h2>Quick Actions</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/route" className="btn-primary" id="find-route-quick-link" style={{ textDecoration: 'none' }}>
                Find Safe Route
              </Link>
              <Link to="/facilities" className="btn-secondary" id="view-facilities-quick-link" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                <Shield size={14} /> View All Facilities
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
