import { Shield, Activity, Database } from 'lucide-react';
import { useEffect, useState } from 'react';
import { neo4jApi } from '../services/neo4jApi';

export default function Navbar() {
  const [connected, setConnected] = useState(null); // null = checking

  useEffect(() => {
    neo4jApi.checkConnection()
      .then(() => setConnected(true))
      .catch(() => setConnected(false));
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <Shield size={22} />
        </div>
        <div className="brand-info">
          <h1>Campus Emergency Response</h1>
          <span>PSG College of Technology, Coimbatore</span>
        </div>
      </div>

      <div className="navbar-status-group">
        <div
          className="system-status-pill"
          style={
            connected === false
              ? { background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }
              : connected === null
              ? { background: '#fffbeb', borderColor: '#fde68a', color: '#d97706' }
              : {}
          }
        >
          <span
            className="pulse-dot"
            style={
              connected === false
                ? { background: '#dc2626', boxShadow: 'none' }
                : connected === null
                ? { background: '#d97706', animation: 'none' }
                : {}
            }
          />
          {connected === null ? 'Connecting…' : connected ? 'System Online' : 'Neo4j Offline'}
        </div>

        <span className="data-source-badge">
          <Database size={11} style={{ display: 'inline', marginRight: 4 }} />
          Neo4j · OSM
        </span>
        <span className="data-source-badge" style={{ color: '#d97706' }}>
          <Activity size={11} style={{ display: 'inline', marginRight: 4 }} />
          MongoDB (planned)
        </span>
      </div>
    </header>
  );
}
