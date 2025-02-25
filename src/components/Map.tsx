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

export const DynamicMap = ({ 
  center, 
  zoom = 18,
  children,
  onLocationSelect
}: {
  center: LatLngExpression;
  zoom?: number;
  children: React.ReactNode;
  onLocationSelect?: (pos: LatLng) => void;
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
      <MapEvents />
      <LeafletTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {children}
    </LeafletMap>
  )
}

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