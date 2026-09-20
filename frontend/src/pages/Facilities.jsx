import { useEffect, useState } from 'react';
import { Shield, MapPin, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { neo4jApi } from '../services/neo4jApi';

const FACILITY_CONFIG = {
  hospital: { emoji: '🏥', label: 'Hospital', color: '#be123c', bg: '#ffe4e6' },
  fire_station: { emoji: '🚒', label: 'Fire Station', color: '#ea580c', bg: '#fff7ed' },
  police: { emoji: '🚔', label: 'Police', color: '#4338ca', bg: '#e0e7ff' },
};

export default function Facilities() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Nearest facility finder
  const [nearLat, setNearLat] = useState('11.0253');
  const [nearLon, setNearLon] = useState('77.0031');
  const [nearType, setNearType] = useState('');
  const [nearResult, setNearResult] = useState(null);
  const [nearLoading, setNearLoading] = useState(false);
  const [nearError, setNearError] = useState(null);

  const loadFacilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const facs = await neo4jApi.getFacilities();
      setFacilities(facs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFacilities(); }, []);

  const handleFindNearest = async (e) => {
    e.preventDefault();
    setNearLoading(true);
    setNearError(null);
    setNearResult(null);
    try {
      const result = await neo4jApi.getNearestFacility(parseFloat(nearLat), parseFloat(nearLon), nearType || null);
      if (!result) {
        setNearError('No facilities found matching the criteria.');
      } else {
        setNearResult(result);
      }
    } catch (err) {
      setNearError(err.message);
    } finally {
      setNearLoading(false);
    }
  };

  const filtered = facilities
    .filter(f => typeFilter === 'All' || f.facilityType === typeFilter)
    .filter(f => !searchQuery || (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  const countByType = type => facilities.filter(f => f.facilityType === type).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} style={{ color: '#2563eb' }} />
            Emergency Facilities
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
            Hospitals, fire stations, and police posts near PSG College of Technology.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadFacilities} id="refresh-facilities-btn">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        {Object.entries(FACILITY_CONFIG).map(([type, cfg]) => (
          <div
            key={type}
            className="status-card"
            style={{ cursor: 'pointer', borderColor: typeFilter === type ? cfg.color : undefined }}
            onClick={() => setTypeFilter(t => t === type ? 'All' : type)}
          >
            <div className="status-card-info">
              <h3>{cfg.label}</h3>
              <div className="status-card-value" style={{ color: cfg.color }}>
                {loading ? '—' : countByType(type)}
              </div>
              <div className="status-card-desc">facilities mapped</div>
            </div>
            <div className="status-card-icon" style={{ background: cfg.bg, color: cfg.color, fontSize: 24 }}>
              {cfg.emoji}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid" style={{ gridTemplateColumns: '1fr 320px', height: 'auto' }}>
        {/* Facilities list */}
        <div>
          {/* Search + filter bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="facilities-search"
                type="text"
                placeholder="Search by name…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-select"
                style={{ paddingLeft: 32 }}
              />
            </div>
            {['All', 'hospital', 'fire_station', 'police'].map(t => (
              <button
                key={t}
                id={`filter-type-${t}`}
                className={`toggle-chip${typeFilter === t ? ' active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'All' ? 'All' : FACILITY_CONFIG[t]?.emoji + ' ' + FACILITY_CONFIG[t]?.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="alert-error"><AlertTriangle size={15} /> {error}</div>
          )}

          {loading ? (
            <div className="loading-state-container">
              <div className="spinner" />
              <p>Loading facilities from Neo4j…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              No facilities found.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {filtered.map(f => {
                const cfg = FACILITY_CONFIG[f.facilityType] || { emoji: '📍', label: f.facilityType, color: '#475569', bg: '#f1f5f9' };
                return (
                  <div key={f.osmId} className="action-card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {cfg.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.name || 'Unnamed Facility'}
                        </p>
                        <p style={{ fontSize: '0.74rem', fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                          {cfg.label}
                        </p>
                        <p style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} />
                          {f.latitude?.toFixed?.(5)}, {f.longitude?.toFixed?.(5)}
                        </p>
                        {f.distanceToRoadMeters != null && (
                          <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                            ~{Math.round(f.distanceToRoadMeters)}m to nearest road node
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nearest Facility Finder */}
        <div className="side-action-column">
          <div className="action-card">
            <div className="action-card-header">
              <h2><MapPin size={16} /> Find Nearest Facility</h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 14 }}>
              Enter coordinates to find the closest emergency facility using Neo4j spatial index.
            </p>

            <form onSubmit={handleFindNearest}>
              <div className="form-group">
                <label className="form-label" htmlFor="near-lat">Latitude</label>
                <input
                  id="near-lat"
                  type="number"
                  step="0.0001"
                  className="form-select"
                  value={nearLat}
                  onChange={e => setNearLat(e.target.value)}
                  placeholder="11.0253"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="near-lon">Longitude</label>
                <input
                  id="near-lon"
                  type="number"
                  step="0.0001"
                  className="form-select"
                  value={nearLon}
                  onChange={e => setNearLon(e.target.value)}
                  placeholder="77.0031"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="near-type-select">Facility Type (optional)</label>
                <select
                  id="near-type-select"
                  className="form-select"
                  value={nearType}
                  onChange={e => setNearType(e.target.value)}
                >
                  <option value="">— Any type —</option>
                  <option value="hospital">🏥 Hospital</option>
                  <option value="fire_station">🚒 Fire Station</option>
                  <option value="police">🚔 Police</option>
                </select>
              </div>

              <button
                type="submit"
                id="find-nearest-btn"
                className="btn-primary"
                disabled={nearLoading}
              >
                {nearLoading ? 'Searching…' : <><MapPin size={14} /> Find Nearest</>}
              </button>
            </form>

            {nearError && (
              <div className="alert-error" style={{ marginTop: 12 }}>
                <AlertTriangle size={14} /> {nearError}
              </div>
            )}

            {nearResult && (() => {
              const cfg = FACILITY_CONFIG[nearResult.facilityType] || { emoji: '📍', label: nearResult.facilityType, color: '#475569', bg: '#f1f5f9' };
              return (
                <div className="route-result-box" style={{ marginTop: 14 }}>
                  <div className="route-result-header">
                    <span className="route-title">{cfg.emoji} Nearest {cfg.label}</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: '6px 0 2px' }}>
                    {nearResult.name || 'Unnamed Facility'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {nearResult.latitude?.toFixed?.(5)}, {nearResult.longitude?.toFixed?.(5)}
                  </p>
                  <div className="route-metrics">
                    <div className="route-metric-item">
                      <div className="route-metric-label">Distance</div>
                      <div className="route-metric-val">
                        {nearResult.distanceMeters >= 1000
                          ? `${(nearResult.distanceMeters / 1000).toFixed(2)} km`
                          : `${Math.round(nearResult.distanceMeters)} m`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Default to PSG campus center button */}
            <button
              id="use-campus-center-btn"
              className="btn-secondary"
              style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
              onClick={() => { setNearLat('11.0253'); setNearLon('77.0031'); }}
              type="button"
            >
              Use PSG Campus Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
