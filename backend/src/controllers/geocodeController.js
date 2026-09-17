const cache = new Map();
const MAX_CACHE_ENTRIES = 200;
let lastUpstreamCallAt = 0;

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function cacheKey(lat, lon) {
  return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > 24 * 60 * 60 * 1000) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { data, cachedAt: Date.now() });
}

async function throttle() {
  const elapsed = Date.now() - lastUpstreamCallAt;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastUpstreamCallAt = Date.now();
}

function mapAddress(address = {}, displayName = '') {
  const division = firstNonEmpty(address.state, address.region);
  const district = firstNonEmpty(address.county, address.state_district, address.city);
  const upazila = firstNonEmpty(
    address.city,
    address.town,
    address.municipality,
    address.city_district,
    address.county === district ? '' : address.county
  );
  // Avoid duplicating district value into upazila when provider repeats it.
  const cleanUpazila = upazila && upazila !== district ? upazila : firstNonEmpty(
    address.town,
    address.municipality,
    address.city_district,
    address.suburb,
    address.borough
  );
  const union = firstNonEmpty(
    address.village,
    address.hamlet,
    address.suburb,
    address.neighbourhood,
    address.neighborhood,
    address.residential
  );
  const road = firstNonEmpty(address.road, address.pedestrian, address.footway);
  const house = firstNonEmpty(address.house_number, address.house_name);
  const composed = [house, road, union || cleanUpazila, district, division].filter(Boolean).join(', ');
  const addressLine = composed || displayName || '';

  return { division, district, upazila: cleanUpazila, union, address: addressLine };
}

async function reverseGeocode(req, res) {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon ?? req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ message: 'lat and lon must be valid coordinates' });
  }

  const key = cacheKey(lat, lon);
  const cached = getCached(key);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    await throttle();
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lon),
      zoom: '18',
      addressdetails: '1',
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let upstream;
    try {
      upstream = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DRMS-local/1.0 (admin-console; reverse-geocode)',
          Referer: 'http://localhost:5173/',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      return res.status(502).json({ message: 'Reverse geocoding service unavailable' });
    }
    const payload = await upstream.json();
    const mapped = mapAddress(payload.address || {}, payload.display_name || '');
    const data = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6)),
      display_name: payload.display_name || '',
      ...mapped,
    };
    setCached(key, data);
    return res.json({ ...data, cached: false });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ message: 'Reverse geocoding timed out' });
    }
    console.error('[geocode/reverse] error:', err);
    return res.status(500).json({ message: 'Failed to reverse geocode location' });
  }
}

module.exports = { reverseGeocode };
