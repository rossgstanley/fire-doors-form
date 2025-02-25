'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { 
  MapContainer as LeafletMap,
  TileLayer as LeafletTileLayer, 
  Marker as LeafletMarker,
  useMap,
  useMapEvents
} from 'react-leaflet'
import type { LatLngExpression, LatLng } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon
const icon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationMarkerProps {
  position: LatLngExpression;
  onPositionChange: (pos: LatLng) => void;
}

interface DynamicMapProps {
  center: [number, number];
  onLocationSelect: (pos: { lat: number; lng: number }) => void;
  stopUpdating?: boolean;
  zoom?: number;
  children?: React.ReactNode;
}

// Create a MapController component to handle map updates
const MapController: React.FC<{ center: [number, number]; stopUpdating: boolean; zoom: number }> = ({ 
  center, 
  stopUpdating,
  zoom 
}) => {
  const map = useMap();

  useEffect(() => {
    if (!stopUpdating) {
      map.setView(center, zoom);
    }
  }, [center, map, stopUpdating, zoom]);

  return null;
};

export const DynamicMap: React.FC<DynamicMapProps> = ({ 
  center, 
  onLocationSelect, 
  stopUpdating = false,
  zoom = 18,
  children 
}) => {
  const MapEvents = () => {
    useMapEvents({
      click: (e) => onLocationSelect?.(e.latlng)
    });
    return null;
  };

  return (
    <LeafletMap 
      center={center} 
      zoom={zoom}
      className="h-full w-full"
      style={{ height: '400px', width: '100%' }}
    >
      <MapController center={center} stopUpdating={stopUpdating} zoom={zoom} />
      <MapEvents />
      <LeafletTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {children}
    </LeafletMap>
  );
};

export const LocationMarker: React.FC<LocationMarkerProps> = ({ position, onPositionChange }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position as L.LatLngExpression, map.getZoom());
  }, [map, position]);

  return (
    <LeafletMarker 
      position={position}
      draggable={true}
      icon={icon}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target as L.Marker;
          onPositionChange(marker.getLatLng());
        },
      }}
    />
  );
}; 