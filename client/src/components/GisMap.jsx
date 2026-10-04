import React, { useEffect, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { getAnimalEmoji, getRiskColorClass } from '../utils/geoUtils';
import { AlertTriangle, Navigation, MapPin, Eye, ExternalLink, Layers, Crosshair } from 'lucide-react';

// Fix default Leaflet icon paths for bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom animal marker HTML
function createEmojiIcon(emoji, bgClass = 'bg-teal-600') {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background: #ffffff;
        border: 2px solid #0d9488;
        border-radius: 50%;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

// Driver Live GPS Marker
const driverIcon = L.divIcon({
  className: 'driver-leaflet-marker',
  html: `
    <div style="
      background: #0284c7;
      border: 3px solid #ffffff;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 0 20px rgba(2, 132, 199, 0.9);
      cursor: pointer;
      animation: pulse 1.5s infinite;
    ">
      🚗
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

// Draggable Pin Icon
const pinIcon = L.divIcon({
  className: 'pin-leaflet-marker',
  html: `
    <div style="
      background: #ef4444;
      color: #ffffff;
      border: 3px solid #ffffff;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.6);
      cursor: grab;
    ">
      📍
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Component to handle map clicks for coordinate selection
function LocationPickerHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to re-center map dynamically and invalidate container dimensions
function RecenterController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size on initial mount and staggered timeouts (essential for tab switching & flex containers)
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    const t3 = setTimeout(() => map.invalidateSize(), 900);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
      map.invalidateSize();
    }
  }, [center, zoom, map]);
  return null;
}

export default function GisMap({
  center = [8.7138, 77.7568],
  zoom = 13,
  hotspots = [],
  reports = [],
  driverLocation = null,
  warningRadius = 350,
  isPickerMode = false,
  selectedLocation = null,
  onLocationSelect = null,
  height = '500px',
}) {
  const [mapCenter, setMapCenter] = useState(center);
  const [mapLayer, setMapLayer] = useState('streets'); // streets | dark | satellite

  useEffect(() => {
    if (driverLocation) {
      setMapCenter([driverLocation.latitude, driverLocation.longitude]);
    } else if (selectedLocation) {
      setMapCenter([selectedLocation.latitude, selectedLocation.longitude]);
    } else if (center) {
      setMapCenter(center);
    }
  }, [center, driverLocation, selectedLocation]);

  const riskColorMap = {
    HIGH: { color: '#ef4444', fill: '#ef4444', fillOpacity: 0.25 },
    MEDIUM: { color: '#f59e0b', fill: '#f59e0b', fillOpacity: 0.22 },
    LOW: { color: '#10b981', fill: '#10b981', fillOpacity: 0.18 },
  };

  const tileLayerUrls = {
    streets: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  // Draggable marker event handlers
  const eventHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        if (marker != null && onLocationSelect) {
          const latLng = marker.getLatLng();
          onLocationSelect(latLng.lat, latLng.lng);
        }
      },
    }),
    [onLocationSelect]
  );

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '16px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      {/* Top Map Layer Switcher Control */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 400,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          borderRadius: '10px',
          padding: '4px',
          border: '1px solid #cbd5e1',
          display: 'flex',
          gap: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <button
          type="button"
          onClick={() => setMapLayer('streets')}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.725rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: mapLayer === 'streets' ? '#0d9488' : 'transparent',
            color: mapLayer === 'streets' ? '#ffffff' : '#475569',
          }}
        >
          🗺️ Street
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('dark')}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.725rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: mapLayer === 'dark' ? '#0d9488' : 'transparent',
            color: mapLayer === 'dark' ? '#ffffff' : '#475569',
          }}
        >
          🌙 High Contrast
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('satellite')}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.725rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: mapLayer === 'satellite' ? '#0d9488' : 'transparent',
            color: mapLayer === 'satellite' ? '#ffffff' : '#475569',
          }}
        >
          🛰️ Satellite
        </button>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ width: '100%', height: height || '500px', minHeight: '350px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          key={mapLayer}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileLayerUrls[mapLayer]}
          subdomains={mapLayer === 'streets' ? 'abc' : 'abcd'}
          maxZoom={19}
        />

        <RecenterController center={mapCenter} />

        {isPickerMode && <LocationPickerHandler onLocationSelect={onLocationSelect} />}

        {/* Render DBSCAN Hotspot Danger Buffers */}
        {hotspots.map((h) => {
          const style = riskColorMap[h.riskLevel] || riskColorMap.LOW;
          return (
            <React.Fragment key={h._id || h.hotspotId}>
              <Circle
                center={[h.centerLatitude, h.centerLongitude]}
                radius={h.radius || 300}
                pathOptions={{
                  color: style.color,
                  fillColor: style.fill,
                  fillOpacity: style.fillOpacity,
                  weight: 2,
                  dashArray: '6, 6',
                }}
              >
                <Popup>
                  <div style={{ minWidth: '220px', padding: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className={`badge ${getRiskColorClass(h.riskLevel)}`}>
                        {h.riskLevel} RISK
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                        {h.hotspotId}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                      {h.name}
                    </h4>

                    <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
                      <strong>{h.reportCount}</strong> animal accident reports clustered within a <strong>{h.radius}m</strong> DBSCAN radius.
                    </p>

                    <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Animal Breakdown:</div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <span>🐕 Dogs: {h.animalDistribution?.Dog || 0}</span>
                        <span>🐈 Cats: {h.animalDistribution?.Cat || 0}</span>
                        <span>🐂 Cattle: {h.animalDistribution?.Cattle || 0}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      Primary Hazard: <strong>{h.mostFrequentCause || 'Poor lighting / Speed'}</strong>
                    </div>
                  </div>
                </Popup>
              </Circle>
            </React.Fragment>
          );
        })}

        {/* Render Individual Accident Report Markers */}
        {reports.map((r) => (
          <Marker
            key={r._id || r.reportId}
            position={[r.latitude, r.longitude]}
            icon={createEmojiIcon(getAnimalEmoji(r.animalType))}
          >
            <Popup>
              <div style={{ minWidth: '220px', padding: '0.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{getAnimalEmoji(r.animalType)}</span>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>
                      {r.animalType} Incident
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: '#0d9488', fontWeight: 700 }}>
                      {r.reportId} • {(r.aiConfidence * 100).toFixed(0)}% AI Conf
                    </span>
                  </div>
                </div>

                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    alt="Animal"
                    style={{
                      width: '100%',
                      height: '100px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: '0.4rem',
                    }}
                  />
                )}

                <p style={{ fontSize: '0.775rem', color: '#334155', margin: '0 0 0.35rem 0' }}>
                  {r.description}
                </p>

                <div style={{ background: '#f1f5f9', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', marginBottom: '0.35rem' }}>
                  <strong>Hazard:</strong> {r.rootCause || 'Road hazard'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                  <span>Status: <strong>{r.status}</strong></span>
                  <span>{new Date(r.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Driver Realtime/Simulated Marker */}
        {driverLocation && (
          <>
            <Marker
              position={[driverLocation.latitude, driverLocation.longitude]}
              icon={driverIcon}
            >
              <Popup>
                <div style={{ padding: '0.25rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>
                    🚗 Driver Live GPS Position
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Lat: {driverLocation.latitude.toFixed(4)}, Lng: {driverLocation.longitude.toFixed(4)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#0f172a', marginTop: '4px' }}>
                    Speed: <strong>{driverLocation.speed || 40} km/h</strong> • Radar Radius: <strong>{warningRadius}m</strong>
                  </p>
                </div>
              </Popup>
            </Marker>
            {/* Proximity scan boundary around driver */}
            <Circle
              center={[driverLocation.latitude, driverLocation.longitude]}
              radius={warningRadius}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#38bdf8',
                fillOpacity: 0.14,
                weight: 2,
              }}
            />
          </>
        )}

        {/* Render Selected Coordinate Marker in Picker Mode */}
        {selectedLocation && (
          <>
            <Marker
              draggable={true}
              eventHandlers={eventHandlers}
              position={[selectedLocation.latitude, selectedLocation.longitude]}
              icon={pinIcon}
            >
              <Popup>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  📍 Selected Accident GPS Pin
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                    Lat: {selectedLocation.latitude.toFixed(5)}, Lng: {selectedLocation.longitude.toFixed(5)}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: '#0d9488', marginTop: '2px' }}>
                    (Tip: You can drag this pin to adjust exact location)
                  </div>
                </div>
              </Popup>
            </Marker>
            {/* Accuracy ring */}
            <Circle
              center={[selectedLocation.latitude, selectedLocation.longitude]}
              radius={40}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#fca5a5',
                fillOpacity: 0.2,
                weight: 1,
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Map Floating Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '15px',
          left: '15px',
          zIndex: 400,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          borderRadius: '10px',
          padding: '0.5rem 0.85rem',
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '0.75rem',
          display: 'flex',
          gap: '0.85rem',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 800, color: '#334155' }}>DBSCAN Hotspots:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span> High Risk
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span> Med Risk
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span> Low Risk
        </span>
      </div>
    </div>
  );
}
