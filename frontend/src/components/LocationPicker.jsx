import { useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [23.685, 90.3563];

function LocationMarker({ position, onChange }) {
  useMapEvents({
    click(event) {
      onChange({ latitude: Number(event.latlng.lat.toFixed(6)), longitude: Number(event.latlng.lng.toFixed(6)) });
    },
  });

  return position ? <CircleMarker center={position} radius={9} pathOptions={{ color: '#f2b705', fillColor: '#f2b705', fillOpacity: 0.75 }} /> : null;
}

export default function LocationPicker({ latitude, longitude, onChange }) {
  const [open, setOpen] = useState(false);
  const position = latitude !== '' && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    ? [Number(latitude), Number(longitude)]
    : null;

  return (
    <div className="location-picker">
      <div className="location-picker__toolbar">
        <div>
          <span className="field-label">Map location</span>
          <small>{position ? `${position[0].toFixed(6)}, ${position[1].toFixed(6)}` : 'No coordinates selected'}</small>
        </div>
        <button type="button" className="btn-secondary compact" onClick={() => setOpen((value) => !value)}>
          {open ? 'Close map' : position ? 'Change on map' : 'Pick on map'}
        </button>
      </div>
      {open && (
        <div className="location-picker__map">
          <MapContainer center={position || DEFAULT_CENTER} zoom={position ? 15 : 7} scrollWheelZoom>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationMarker position={position} onChange={onChange} />
          </MapContainer>
          <small className="location-picker__hint">Click the map to place the facility marker.</small>
        </div>
      )}
    </div>
  );
}
