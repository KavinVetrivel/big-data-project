import { useEffect, useState } from 'react';
import { MapPin, GitMerge, Shield, Building2, RefreshCw, Layers } from 'lucide-react';
import { neo4jApi } from '../services/neo4jApi';
import { MOCK_INCIDENTS } from '../data/mockIncidents';
import CampusMap from '../components/CampusMap.jsx';

export default function MapExplorer() {
  const [roadSegments, setRoadSegments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showRoads, setShowRoads] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [segs, facs, bldgs] = await Promise.all([
        neo4jApi.getRoadSegments(2000),
        neo4jApi.getFacilities(),
        neo4jApi.getBuildings(200),
      ]);
      setRoadSegments(segs);
      setFacilities(facs);
      setBuildings(bldgs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const blockedCount = roadSegments.filter(s => s.blocked).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} style={{ color: '#2563eb' }} />
            Map Explorer
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
            Visualize the full PSG campus road network, buildings and emergency facilities.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadData} id="refresh-map-explorer-btn">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert-error">
          {error}
        </div>
      )}

      {/* Layer toggles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { label: 'Roads', icon: GitMerge, state: showRoads, setter: setShowRoads, id: 'toggle-roads-explorer' },
          { label: 'Facilities', icon: Shield, state: showFacilities, setter: setShowFacilities, id: 'toggle-facilities-explorer' },
          { label: 'Buildings', icon: Building2, state: showBuildings, setter: setShowBuildings, id: 'toggle-buildings-explorer' },
          { label: 'Incidents', icon: Layers, state: showIncidents, setter: setShowIncidents, id: 'toggle-incidents-explorer' },
        ].map(({ label, icon: Icon, state, setter, id }) => (
          <button
            key={label}
            id={id}
            className={`toggle-chip${state ? ' active' : ''}`}
            onClick={() => setter(v => !v)}
          >
            <Icon size={12} /> {label}
          </button>
        ))}

        {blockedCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
            ⚠ {blockedCount} blocked segment{blockedCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Map full height */}
      <div
        className="map-container-card"
        style={{ flex: 1, minHeight: 520, position: 'relative' }}
      >
        {loading ? (
          <div className="loading-state-container" style={{ height: '100%' }}>
            <div className="spinner" />
            <p>Loading campus network…</p>
          </div>
        ) : (
          <>
            <CampusMap
              roadSegments={roadSegments}
              facilities={facilities}
              buildings={buildings}
              incidents={MOCK_INCIDENTS}
              showRoads={showRoads}
              showFacilities={showFacilities}
              showBuildings={showBuildings}
              showIncidents={showIncidents}
              height="100%"
            />

            {/* Stats bar overlay */}
            <div style={{
              position: 'absolute', top: 12, right: 12, zIndex: 1000,
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
              border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 16px',
              fontSize: '0.78rem', display: 'flex', gap: 20
            }}>
              {[
                { label: 'Road Segments', val: roadSegments.length, color: '#2563eb' },
                { label: 'Facilities', val: facilities.length, color: '#be123c' },
                { label: 'Buildings', val: buildings.length, color: '#475569' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{val}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="map-legend-box">
              <span className="legend-item"><span className="legend-line" style={{ background: '#3b82f6' }} /> Road</span>
              <span className="legend-item"><span className="legend-line" style={{ background: '#dc2626' }} /> Blocked</span>
              <span className="legend-item"><span className="legend-color" style={{ background: '#be123c' }} /> Hospital</span>
              <span className="legend-item"><span className="legend-color" style={{ background: '#ea580c' }} /> Fire Stn</span>
              <span className="legend-item"><span className="legend-color" style={{ background: '#4338ca' }} /> Police</span>
              <span className="legend-item"><span className="legend-color" style={{ background: '#64748b', borderRadius: '50%' }} /> Building</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
