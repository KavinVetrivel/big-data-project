import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Navigation,
  AlertTriangle,
  Building2,
  Terminal,
  Database,
  Layers
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map', icon: Map, label: 'Map Explorer' },
  { to: '/route', icon: Navigation, label: 'Route Finder' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/mongo-queries', icon: Terminal, label: 'MongoDB Queries' },
  { to: '/facilities', icon: Building2, label: 'Facilities' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="datasource-card">
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Data Sources
          </p>
          <div className="datasource-item">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Database size={12} />
              Neo4j Graph
            </span>
            <span className="badge-connected">● Live</span>
          </div>
          <div className="datasource-item">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={12} />
              OpenStreetMap
            </span>
            <span className="badge-connected">● Live</span>
          </div>
          <div className="datasource-item">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Database size={12} />
              MongoDB
            </span>
            <span className="badge-connected">● Live</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
