import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';

// PSG College of Technology approximate center
const PSG_CENTER = [11.0253, 77.0031];
const DEFAULT_ZOOM = 16;

/**
 * Reusable Leaflet map component for the PSG campus network.
 *
 * Props:
 *  - roadSegments: Array<{fromLat, fromLon, toLat, toLon, blocked, highwayType, name}>
 *  - facilities: Array<{osmId, name, facilityType, latitude, longitude}>
 *  - buildings: Array<{osmId, name, buildingType, latitude, longitude}>
 *  - routeNodes: Array<{latitude, longitude, osmId}> — highlighted route path
 *  - incidents: Array<{id, type, severity, location, building, description}>
 *  - showRoads: boolean
 *  - showFacilities: boolean
 *  - showBuildings: boolean
 *  - showIncidents: boolean
 *  - onNodeClick: (osmId) => void — called when user clicks a RoadNode marker
 *  - height: string (default '100%')
 */
export default function CampusMap({
  roadSegments = [],
  facilities = [],
  buildings = [],
  routeNodes = [],
  incidents = [],
  showRoads = true,
  showFacilities = true,
  showBuildings = false,
  showIncidents = true,
  onNodeClick = null,
  height = '100%',
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    roads: null,
    facilities: null,
    buildings: null,
    route: null,
    incidents: null,
  });

  // --- Initialize Map ---
  useEffect(() => {
    if (mapInstanceRef.current) return; // already initialised

    const map = L.map(mapRef.current, {
      center: PSG_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // --- Roads Layer ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.roads) {
      layersRef.current.roads.remove();
      layersRef.current.roads = null;
    }

    if (!showRoads || roadSegments.length === 0) return;

    const group = L.layerGroup();
    roadSegments.forEach(seg => {
      const color = seg.blocked ? '#dc2626' : '#3b82f6';
      const weight = seg.blocked ? 4 : 2;
      const opacity = seg.blocked ? 0.9 : 0.55;

      const line = L.polyline(
        [[seg.fromLat, seg.fromLon], [seg.toLat, seg.toLon]],
        { color, weight, opacity }
      );

      if (seg.name || seg.highwayType) {
        line.bindTooltip(
          `${seg.name || 'Unnamed Road'} (${seg.highwayType || ''})${seg.blocked ? ' ⚠ BLOCKED' : ''}`,
          { sticky: true, className: 'leaflet-tooltip-custom' }
        );
      }
      group.addLayer(line);
    });

    group.addTo(map);
    layersRef.current.roads = group;
  }, [roadSegments, showRoads]);

  // --- Facilities Layer ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.facilities) {
      layersRef.current.facilities.remove();
      layersRef.current.facilities = null;
    }

    if (!showFacilities || facilities.length === 0) return;

    const group = L.layerGroup();

    facilities.forEach(f => {
      const colorMap = {
        hospital: '#be123c',
        fire_station: '#ea580c',
        police: '#4338ca',
      };
      const emojiMap = {
        hospital: '🏥',
        fire_station: '🚒',
        police: '🚔',
      };

      const color = colorMap[f.facilityType] || '#475569';
      const emoji = emojiMap[f.facilityType] || '📍';

      const icon = L.divIcon({
        className: '',
        html: `<div class="facility-custom-marker marker-${f.facilityType === 'fire_station' ? 'fire' : f.facilityType}" title="${f.name || f.facilityType}">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([f.latitude, f.longitude], { icon });
      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 140px;">
          <p style="font-weight:700; font-size:0.88rem; margin-bottom:4px;">${f.name || 'Unnamed Facility'}</p>
          <p style="font-size:0.78rem; color:${color}; font-weight:600; text-transform:uppercase;">${f.facilityType?.replace('_', ' ')}</p>
          ${f.distanceToRoadMeters != null ? `<p style="font-size:0.72rem; color:#64748b; margin-top:4px;">~${Math.round(f.distanceToRoadMeters)}m to road</p>` : ''}
        </div>
      `);
      group.addLayer(marker);
    });

    group.addTo(map);
    layersRef.current.facilities = group;
  }, [facilities, showFacilities]);

  // --- Buildings Layer ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.buildings) {
      layersRef.current.buildings.remove();
      layersRef.current.buildings = null;
    }

    if (!showBuildings || buildings.length === 0) return;

    const group = L.layerGroup();

    buildings.forEach(b => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="building-custom-marker" title="${b.name || 'Building'}"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      const marker = L.marker([b.latitude, b.longitude], { icon });
      marker.bindTooltip(b.name || `Building (${b.buildingType || 'unknown'})`, { sticky: true });
      group.addLayer(marker);
    });

    group.addTo(map);
    layersRef.current.buildings = group;
  }, [buildings, showBuildings]);

  // --- Incidents Layer ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.incidents) {
      layersRef.current.incidents.remove();
      layersRef.current.incidents = null;
    }

    if (!showIncidents || incidents.length === 0) return;

    const group = L.layerGroup();

    const severityEmoji = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' };

    incidents.forEach(inc => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="facility-custom-marker marker-incident" title="${inc.type}" style="font-size:14px;">⚠</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([inc.location.latitude, inc.location.longitude], { icon });
      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 160px;">
          <p style="font-weight:700; font-size:0.88rem; margin-bottom:2px;">${severityEmoji[inc.severity] || '⚠'} ${inc.type}</p>
          <p style="font-size:0.78rem; color:#dc2626; font-weight:600;">${inc.severity} · ${inc.status}</p>
          <p style="font-size:0.78rem; color:#475569; margin-top:4px;">${inc.building}</p>
          <p style="font-size:0.72rem; color:#64748b; margin-top:2px;">${inc.description}</p>
        </div>
      `);
      group.addLayer(marker);
    });

    group.addTo(map);
    layersRef.current.incidents = group;
  }, [incidents, showIncidents]);

  // --- Route Layer ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.route) {
      layersRef.current.route.remove();
      layersRef.current.route = null;
    }

    if (!routeNodes || routeNodes.length < 2) return;

    const group = L.layerGroup();

    // Route polyline (green)
    const latlngs = routeNodes.map(n => [n.latitude, n.longitude]);
    const line = L.polyline(latlngs, {
      color: '#16a34a',
      weight: 5,
      opacity: 0.9,
      dashArray: null,
    });
    group.addLayer(line);

    // Start marker
    const startIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;background:#16a34a;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    group.addLayer(L.marker(latlngs[0], { icon: startIcon }).bindTooltip('Start'));

    // End marker
    const endIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;background:#dc2626;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    group.addLayer(L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).bindTooltip('Destination'));

    group.addTo(map);
    map.fitBounds(line.getBounds(), { padding: [30, 30] });
    layersRef.current.route = group;
  }, [routeNodes]);

  return (
    <div
      ref={mapRef}
      id="campus-map"
      style={{ width: '100%', height, minHeight: 400, background: '#e2e8f0' }}
    />
  );
}
