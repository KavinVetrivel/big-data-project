import { useState, useEffect } from 'react';
import { AlertTriangle, Filter, Clock, MapPin, Database, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import { MOCK_INCIDENTS } from '../data/mockIncidents';

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const STATUS_COLORS = {
  Active: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  Investigating: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  Resolved: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
};

export default function Incidents() {
  const [filter, setFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);
  const [isLiveMongo, setIsLiveMongo] = useState(false);

  useEffect(() => {
    // Attempt fetching live incidents from MongoDB
    apiClient.get('/mongo/query/projection')
      .then(res => {
        if (res.data?.data && res.data.data.length > 0) {
          setIsLiveMongo(true);
        }
      })
      .catch(() => {
        setIsLiveMongo(false);
      });
  }, []);

  const filtered = incidents
    .filter(i => filter === 'All' || i.status === filter)
    .filter(i => severityFilter === 'All' || i.severity === severityFilter)
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const counts = {
    Active: incidents.filter(i => i.status === 'Active').length,
    Investigating: incidents.filter(i => i.status === 'Investigating').length,
    Resolved: incidents.filter(i => i.status === 'Resolved').length,
  };

  const formatTime = iso => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={20} style={{ color: '#dc2626' }} />
            Campus Emergency Incidents
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
            Real-time incident tracking across PSG College campus blocks.
          </p>
        </div>

        {/* Link to Dedicated Mongo Commands Page */}
        <Link
          to="/mongo-queries"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#047857',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: 8,
            boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
          }}
        >
          <Database size={15} />
          Open MongoDB Query Console
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Summary cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        {Object.entries(counts).map(([status, count]) => {
          const style = STATUS_COLORS[status];
          return (
            <div key={status} className="status-card" style={{ borderColor: style.border, cursor: 'pointer' }} onClick={() => setFilter(status === filter ? 'All' : status)}>
              <div className="status-card-info">
                <h3>{status}</h3>
                <div className="status-card-value" style={{ color: style.color }}>{count}</div>
                <div className="status-card-desc">incidents</div>
              </div>
              <div className="status-card-icon" style={{ background: style.bg, color: style.color }}>
                <AlertTriangle size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: '#94a3b8' }} />
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Status:</span>
        {['All', 'Active', 'Investigating', 'Resolved'].map(s => (
          <button
            key={s}
            id={`filter-status-${s.toLowerCase()}`}
            className={`toggle-chip${filter === s ? ' active' : ''}`}
            onClick={() => setFilter(s)}
          >{s}</button>
        ))}
        <span style={{ marginLeft: 12, fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Severity:</span>
        {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => (
          <button
            key={s}
            id={`filter-severity-${s.toLowerCase()}`}
            className={`toggle-chip${severityFilter === s ? ' active' : ''}`}
            onClick={() => setSeverityFilter(s)}
          >{s}</button>
        ))}
      </div>

      {/* Incident list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: '0.88rem' }}>
            No incidents match the selected filters.
          </div>
        )}
        {filtered.map(inc => {
          const statusStyle = STATUS_COLORS[inc.status] || STATUS_COLORS.Active;
          return (
            <div key={inc.id || inc.incidentId} className="incident-card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'start' }}>
              {/* Left: type icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: inc.severity === 'Critical' ? '#fef2f2' : inc.severity === 'High' ? '#fff7ed' : '#fffbeb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0
              }}>
                {inc.type === 'Medical Emergency' ? '🏥'
                  : inc.type === 'Fire' ? '🔥'
                  : inc.type === 'Road Blockage' ? '🚧'
                  : inc.type === 'Flooding' ? '🌊'
                  : inc.type === 'Chemical Hazard' ? '☣️'
                  : inc.type === 'Security Issue' ? '🔒'
                  : '⚠'}
              </div>

              {/* Middle: details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="incident-title">{inc.title || inc.type}</span>
                  <span className={`severity-pill severity-${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                    {inc.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <MapPin size={11} /> {inc.building}
                </p>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>{inc.description}</p>
              </div>

              {/* Right: time + id */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <Clock size={10} /> {formatTime(inc.reportedAt)}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#cbd5e1', fontFamily: 'monospace', marginTop: 2 }}>{inc.id || inc.incidentId}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
