import { useRef, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { reverseGeocode } from '../utils/api';
import { pickAdminFields } from '../utils/reverseGeocode';

const DEFAULT_CENTER = [23.685, 90.3563];

function LocationMarker({ position, onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return position ? <CircleMarker center={position} radius={9} pathOptions={{ color: '#f2b705', fillColor: '#f2b705', fillOpacity: 0.75 }} /> : null;
}

export default function LocationPicker({ latitude, longitude, onChange, onAutoFill }) {
  const [open, setOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState({ type: '', text: '' });
  const requestId = useRef(0);
  const position = latitude !== '' && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    ? [Number(latitude), Number(longitude)]
    : null;

  async function handleSelect(coordinates) {
    onChange(coordinates);
    if (!onAutoFill) return;
    const current = ++requestId.current;
    setGeocoding(true);
    setGeoStatus({ type: '', text: 'Looking up district / upazila…' });
    try {
      const data = await reverseGeocode(coordinates.latitude, coordinates.longitude);
      if (current !== requestId.current) return;
      const filled = pickAdminFields(data);
      if (Object.keys(filled).length) {
        onAutoFill(filled);
        setGeoStatus({ type: 'success', text: 'Location found. Administrative fields were filled automatically. Please verify them before saving.' });
      } else {
        setGeoStatus({ type: 'error', text: 'Coordinates saved, but administrative details could not be found. Please enter them manually.' });
      }
    } catch {
      if (current !== requestId.current) return;
      setGeoStatus({ type: 'error', text: 'Coordinates saved, but administrative details could not be found. Please enter them manually.' });
    } finally {
      if (current === requestId.current) setGeocoding(false);
    }
  }

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
            <LocationMarker position={position} onSelect={handleSelect} />
          </MapContainer>
          <small className="location-picker__hint">Click the map to place the facility marker{onAutoFill ? ' — district / upazila will be filled automatically.' : '.'}{geocoding ? ' Looking up…' : ''}</small>
          {geoStatus.text && <div className={geoStatus.type === 'success' ? 'success-banner' : geoStatus.type === 'error' ? 'error-banner' : 'empty-state'} style={{ margin: '8px 12px 12px' }}>{geoStatus.text}</div>}
        </div>
      )}
    </div>
  );
}
