import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack/React
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface MapEntryData {
    lat: number;
    lng: number;
    title: string;
    date?: string;
    thumbnail?: string;
    snippet?: string;
}

interface MapProps {
    entries: MapEntryData[];
    route?: { lat: number; lng: number }[];
    zoom?: number;
    onMapClick?: (lat: number, lng: number) => void;
}

// Component to automatically zoom/pan to fit all markers
const FitBounds = ({ entries }: { entries: MapEntryData[] }) => {
    const map = useMap();
    
    // Create a stable identifier for the coordinates to avoid unnecessary re-zooming
    const coordinatesHash = JSON.stringify(entries.map(e => `${e.lat.toFixed(4)},${e.lng.toFixed(4)}`));

    useEffect(() => {
        if (entries.length === 0) return;
        
        const bounds = L.latLngBounds(entries.map(e => [e.lat, e.lng]));
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [coordinatesHash, map, entries]);

    return null;
};

// Component to handle map clicks
const MapClickHandler = ({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            if (onMapClick) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
};

const MapComponent: React.FC<MapProps> = ({ entries, route, zoom, onMapClick }) => {
    // Default center (somewhere in Norway) if no entries
    const defaultCenter: [number, number] = [65.4720, 12.4689]; 
    const mapCenter = (entries.length > 0 ? [entries[0].lat, entries[0].lng] : defaultCenter) as [number, number];

    const polylinePositions = route ? route.map(p => [p.lat, p.lng] as [number, number]) : [];

    return (
        <MapContainer center={mapCenter} zoom={zoom || 5} scrollWheelZoom={true} style={{ height: "100%", width: "100%", borderRadius: "0", cursor: onMapClick ? "crosshair" : "grab" }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <FitBounds entries={entries} />
            <MapClickHandler onMapClick={onMapClick} />
            
            {polylinePositions.length > 1 && (
                <Polyline 
                    positions={polylinePositions} 
                    pathOptions={{ 
                        color: '#2563eb', 
                        weight: 4, 
                        opacity: 0.8, 
                        dashArray: '10, 10',
                        lineCap: 'round' 
                    }} 
                />
            )}

            {entries.map((entry, idx) => (
                <Marker key={idx} position={[entry.lat, entry.lng]}>
                    <Popup minWidth={200} maxWidth={300}>
                        <div className="flex flex-col gap-2">
                            <h3 className="font-bold text-base m-0 text-slate-800">{entry.title}</h3>
                            
                            {entry.date && (
                                <div className="text-xs text-slate-500 flex items-center gap-1 border-b border-slate-100 pb-1">
                                    <span>{new Date(entry.date).toLocaleDateString('no-NO')}</span>
                                    <span>kl. {new Date(entry.date).toLocaleTimeString('no-NO', {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            )}
                            
                            {entry.thumbnail && (
                                <div className="w-full aspect-video bg-slate-100 rounded-md overflow-hidden border border-slate-200">
                                    <img 
                                        src={entry.thumbnail} 
                                        alt="Minne" 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                            )}
                            
                            {entry.snippet && (
                                <p className="text-sm text-slate-700 m-0 line-clamp-3 italic bg-slate-50 p-2 rounded">
                                    "{entry.snippet}"
                                </p>
                            )}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default MapComponent;