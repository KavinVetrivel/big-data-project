import { useEffect, useState } from 'react';
import { Navigation, RefreshCw, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { neo4jApi } from '../services/neo4jApi';
import CampusMap from '../components/CampusMap.jsx';

export default function RouteFinder() {
  const [roads, setRoads] = useState([]);
  const [roadSegments, setRoadSegments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loadingRoads, setLoadingRoads] = useState(true);

  const [fromNode, setFromNode] = useState('');
  const [toNode, setToNode] = useState('');
  const [avoidBlocked, setAvoidBlocked] = useState(true);
  const [routeResult, setRouteResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // Block simulation
  const [blockOsmWayId, setBlockOsmWayId] = useState('');
  const [blockStatus, setBlockStatus] = useState(null);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingRoads(true);
      try {
        const [r, segs, facs] = await Promise.all([
          neo4jApi.getRoads(500),
          neo4jApi.getRoadSegments(1500),
          neo4jApi.getFacilities(),
        ]);
        setRoads(r);
        setRoadSegments(segs);
        setFacilities(facs);
      } catch (e) {
        // silently handled
      } finally {
        setLoadingRoads(false);
      }
    };
    load();
  }, []);

  const handleFindRoute = async (e) => {
    e.preventDefault();
    if (!fromNode || !toNode) return;
    setSearching(true);
    setRouteError(null);
    setRouteResult(null);
    try {
      const result = await neo4jApi.getRoute(fromNode, toNode, avoidBlocked);
      if (!result) {
        setRouteError('No path found between these nodes. Try disabling "Avoid Blocked" or choose different nodes.');
      } else {
        setRouteResult(result);
      }
    } catch (err) {
      setRouteError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleBlockRoad = async () => {
    if (!blockOsmWayId) return;
    setBlocking(true);
    setBlockStatus(null);
    try {
      const res = await neo4jApi.setRoadBlock(blockOsmWayId, true);
      setBlockStatus({ success: true, message: res.message || 'Road blocked successfully.' });
      // Refresh segments
      const segs = await neo4jApi.getRoadSegments(1500);
      setRoadSegments(segs);
    } catch (err) {
      setBlockStatus({ success: false, message: err.message });
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblockRoad = async () => {
    if (!blockOsmWayId) return;
    setBlocking(true);
    setBlockStatus(null);
    try {
      const res = await neo4jApi.setRoadBlock(blockOsmWayId, false);
      setBlockStatus({ success: true, message: res.message || 'Road unblocked successfully.' });
      const segs = await neo4jApi.getRoadSegments(1500);
      setRoadSegments(segs);
    } catch (err) {
      setBlockStatus({ success: false, message: err.message });
    } finally {
      setBlocking(false);
    }
  };

  const routeNodes = routeResult?.pathNodes || [];
  const blockedCount = roadSegments.filter(s => s.blocked).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Navigation size={18} style={{ color: '#2563eb' }} />
          Route Finder
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
          Find the shortest safe path between two road nodes. Simulate blocked roads and recompute.
        </p>
      </div>

      <div className="dashboard-main-grid" style={{ height: 'auto', minHeight: 'unset' }}>
        {/* Controls */}
        <div className="map-container-card" style={{ minHeight: 480, position: 'relative' }}>
          {loadingRoads ? (
            <div className="loading-state-container" style={{ flex: 1 }}>
              <div className="spinner" />
              <p>Loading road network…</p>
            </div>
          ) : (
            <>
              <CampusMap
                roadSegments={roadSegments}
                facilities={facilities}
                routeNodes={routeNodes}
                showRoads={true}
                showFacilities={true}
                showBuildings={false}
                showIncidents={false}
                height="100%"
              />
              {blockedCount > 0 && (
                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', fontSize: '0.76rem', fontWeight: 600, color: '#dc2626' }}>
                  ⚠ {blockedCount} segment{blockedCount !== 1 ? 's' : ''} blocked
                </div>
              )}
              <div className="map-legend-box">
                <span className="legend-item"><span className="legend-line" style={{ background: '#3b82f6' }} /> Road</span>
                <span className="legend-item"><span className="legend-line" style={{ background: '#dc2626' }} /> Blocked</span>
                <span className="legend-item"><span className="legend-line" style={{ background: '#16a34a' }} /> Route</span>
              </div>
            </>
          )}
        </div>

        <div className="side-action-column">
          {/* Route query form */}
          <div className="action-card">
            <div className="action-card-header">
              <h2><Navigation size={16} /> Find Shortest Route</h2>
            </div>

            <form onSubmit={handleFindRoute}>
              <div className="form-group">
                <label className="form-label" htmlFor="from-node-select">From (Road Node osmId)</label>
                <select
                  id="from-node-select"
                  className="form-select"
                  value={fromNode}
                  onChange={e => setFromNode(e.target.value)}
                >
                  <option value="">— Select start node —</option>
                  {roads.map(r => (
                    <option key={r.osmId} value={r.osmId}>
                      {r.osmId} ({r.latitude?.toFixed?.(4)}, {r.longitude?.toFixed?.(4)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="to-node-select">To (Road Node osmId)</label>
                <select
                  id="to-node-select"
                  className="form-select"
                  value={toNode}
                  onChange={e => setToNode(e.target.value)}
                >
                  <option value="">— Select destination node —</option>
                  {roads.map(r => (
                    <option key={r.osmId} value={r.osmId}>
                      {r.osmId} ({r.latitude?.toFixed?.(4)}, {r.longitude?.toFixed?.(4)})
                    </option>
                  ))}
                </select>
              </div>

              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  id="avoid-blocked-checkbox"
                  checked={avoidBlocked}
                  onChange={e => setAvoidBlocked(e.target.checked)}
                />
                Avoid blocked road segments
              </label>

              <button
                type="submit"
                className="btn-primary"
                id="find-route-btn"
                disabled={searching || !fromNode || !toNode}
              >
                {searching ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Computing…</> : <><Navigation size={15} /> Find Route</>}
              </button>
            </form>

            {routeError && (
              <div className="alert-error" style={{ marginTop: 14 }}>
                <AlertTriangle size={15} /> {routeError}
              </div>
            )}

            {routeResult && (
              <div className="route-result-box">
                <div className="route-result-header">
                  <span className="route-title">✅ Route Found</span>
                  <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>
                    {routeResult.hops} hop{routeResult.hops !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="route-metrics">
                  <div className="route-metric-item">
                    <div className="route-metric-label">Distance</div>
                    <div className="route-metric-val">
                      {routeResult.totalDistanceMeters >= 1000
                        ? `${(routeResult.totalDistanceMeters / 1000).toFixed(2)} km`
                        : `${Math.round(routeResult.totalDistanceMeters)} m`}
                    </div>
                  </div>
                  <div className="route-metric-item">
                    <div className="route-metric-label">Path Nodes</div>
                    <div className="route-metric-val">{routeResult.pathNodes?.length}</div>
                  </div>
                </div>

                {routeResult.segments?.some(s => s.blocked) && (
                  <div style={{ marginTop: 8, fontSize: '0.74rem', color: '#dc2626', fontWeight: 600 }}>
                    ⚠ This route passes through blocked segments.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Emergency simulation */}
          <div className="action-card">
            <div className="action-card-header">
              <h2><AlertTriangle size={16} /> Emergency Simulation</h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12 }}>
              Block or unblock a road segment (by OSM Way ID) to simulate an emergency obstruction.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="block-way-id">OSM Way ID</label>
              <input
                id="block-way-id"
                type="text"
                className="form-select"
                placeholder="e.g. 123456789"
                value={blockOsmWayId}
                onChange={e => setBlockOsmWayId(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="block-road-btn"
                className="btn-primary"
                style={{ flex: 1, background: '#dc2626' }}
                onClick={handleBlockRoad}
                disabled={blocking || !blockOsmWayId}
              >
                {blocking ? '…' : 'Block Road'}
              </button>
              <button
                id="unblock-road-btn"
                className="btn-primary"
                style={{ flex: 1, background: '#16a34a' }}
                onClick={handleUnblockRoad}
                disabled={blocking || !blockOsmWayId}
              >
                {blocking ? '…' : 'Unblock'}
              </button>
            </div>

            {blockStatus && (
              <div
                className={blockStatus.success ? 'route-result-box' : 'alert-error'}
                style={{ marginTop: 12 }}
              >
                {blockStatus.success
                  ? <><CheckCircle size={14} style={{ color: '#16a34a' }} /> {blockStatus.message}</>
                  : <><AlertTriangle size={14} /> {blockStatus.message}</>
                }
              </div>
            )}

            {roadSegments.filter(s => s.blocked).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Currently Blocked Way IDs
                </p>
                {[...new Set(roadSegments.filter(s => s.blocked).map(s => s.osmWayId))].map(id => (
                  <div
                    key={id}
                    style={{ fontSize: '0.78rem', padding: '3px 8px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, marginBottom: 4, cursor: 'pointer', fontFamily: 'monospace' }}
                    onClick={() => setBlockOsmWayId(String(id))}
                  >
                    {id}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
