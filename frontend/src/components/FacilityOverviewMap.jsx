import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const DEFAULT_CENTER = [23.685, 90.3563];

function toPoint(row, kind, idKey) {
  const lat = Number(row?.latitude);
  const lng = Number(row?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    id: `${kind}-${row?.[idKey] ?? `${lat},${lng}`}`,
    lat,
    lng,
    kind,
    name: String(row?.name || (kind === 'shelter' ? 'Shelter' : 'Warehouse')),
  };
}

function facilityIcon(kind, delay) {
  const rings =
    kind === 'shelter'
      ? `<span class="facility-dot__ping" style="animation-delay:${delay}ms"></span><span class="facility-dot__ping ping--delayed" style="animation-delay:${delay + 900}ms"></span>`
      : `<span class="facility-dot__halo"></span>`;
  return L.divIcon({
    className: 'facility-dot-wrap',
    html: `<div class="facility-dot facility-dot--${kind}" style="animation-delay:${delay}ms">${rings}<span class="facility-dot__core"></span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(DEFAULT_CENTER, 7);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.2));
  }, [map, points.map((p) => p.id).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function HeatLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 4) return undefined;
    const layer = L.heatLayer(
      points.map((p) => [p.lat, p.lng, p.kind === 'shelter' ? 1 : 0.6]),
      {
        radius: 28,
        blur: 22,
        maxZoom: 12,
        minOpacity: 0.35,
        gradient: { 0.3: '#f2b705', 0.6: '#e07f2e', 1: '#e4572e' },
      }
    );
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points.map((p) => p.id).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function FacilityOverviewMap({ shelters = [], warehouses = [] }) {
  const points = useMemo(() => {
    const list = [];
    for (const row of shelters) {
      const point = toPoint(row, 'shelter', 'shelter_id');
      if (point) list.push(point);
    }
    for (const row of warehouses) {
      const point = toPoint(row, 'warehouse', 'warehouse_id');
      if (point) list.push(point);
    }
    return list;
  }, [shelters, warehouses]);

  const shelterCount = points.filter((p) => p.kind === 'shelter').length;
  const warehouseCount = points.filter((p) => p.kind === 'warehouse').length;
  const total = (shelters?.length || 0) + (warehouses?.length || 0);

  return (
    <section className="facility-overview" aria-label="Registered facilities map">
      <div className="facility-overview__header">
        <div>
          <p className="eyebrow">Facilities map</p>
          <h3>Registered shelters &amp; warehouses</h3>
        </div>
        <div className="facility-overview__meta">
          <span className="count-badge">{shelterCount} shelters</span>
          <span className="count-badge">{warehouseCount} warehouses</span>
        </div>
      </div>
      {points.length ? (
        <>
          <div className="facility-overview__map">
            <MapContainer center={DEFAULT_CENTER} zoom={7} scrollWheelZoom={false}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBounds points={points} />
              <HeatLayer points={points} />
              {points.map((point, index) => (
                <Marker
                  key={point.id}
                  position={[point.lat, point.lng]}
                  icon={facilityIcon(point.kind, Math.min(index, 30) * 35)}
                  keyboard={false}
                  bubblingMouseEvents={false}
                >
                  <Tooltip direction="top" offset={[0, -12]} opacity={1} sticky>
                    <strong>{point.name}</strong>
                    <small>{point.kind === 'shelter' ? 'Shelter' : 'Warehouse'}</small>
                  </Tooltip>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="facility-overview__footer">
            <span className="facility-legend"><span className="legend-dot legend-dot--shelter legend-dot--blink" />Shelter</span>
            <span className="facility-legend"><span className="legend-dot legend-dot--warehouse" />Warehouse</span>
            <small>{points.length} of {total} facilities have coordinates{total - points.length > 0 ? ' — others are list-only' : ''}. Hover a marker for its name.</small>
          </div>
        </>
      ) : (
        <div className="empty-state">No mapped facilities yet. Pick a location on the map while registering a shelter or warehouse.</div>
      )}
    </section>
  );
}
