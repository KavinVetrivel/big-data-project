import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MapExplorer from './pages/MapExplorer.jsx';
import RouteFinder from './pages/RouteFinder.jsx';
import Incidents from './pages/Incidents.jsx';
import Facilities from './pages/Facilities.jsx';
import MongoQueries from './pages/MongoQueries.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/map" element={<MapExplorer />} />
            <Route path="/route" element={<RouteFinder />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/mongo-queries" element={<MongoQueries />} />
            <Route path="/facilities" element={<Facilities />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
