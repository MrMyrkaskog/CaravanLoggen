import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack/React
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
    entries: { lat: number; lng: number; title: string }[];
    route?: { lat: number; lng: number }[];
    center?: [number, number];
    zoom?: number;
}

const RecenterAutomatically = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng]);
    }, [lat, lng, map]);
    return null;
};

const MapComponent: React.FC<MapProps> = ({ entries, route, center, zoom }) => {
    // Default to somewhere in Norway if no center provided
    const defaultCenter: [number, number] = [60.4720, 8.4689]; 
    const mapCenter = center || (entries.length > 0 ? [entries[0].lat, entries[0].lng] : defaultCenter);

    // Convert route object to array of arrays for Leaflet
    const polylinePositions = route ? route.map(p => [p.lat, p.lng] as [number, number]) : [];

    return (
        <MapContainer center={mapCenter} zoom={zoom || 6} scrollWheelZoom={true} style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {center && <RecenterAutomatically lat={center[0]} lng={center[1]} />}
            
            {/* Draw the route line if we have more than 1 point */}
            {polylinePositions.length > 1 && (
                <Polyline 
                    positions={polylinePositions} 
                    pathOptions={{ 
                        color: '#2563eb', // Blue-600
                        weight: 4, 
                        opacity: 0.7, 
                        dashArray: '10, 10', // Stiplet linje
                        lineCap: 'round' 
                    }} 
                />
            )}

            {entries.map((entry, idx) => (
                <Marker key={idx} position={[entry.lat, entry.lng]}>
                    <Popup>
                        {entry.title}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default MapComponent;