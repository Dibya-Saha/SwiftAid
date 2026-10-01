const BASE_URL = '/api';

export async function reverseGeocode(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Invalid coordinates for reverse geocoding');
  }

  const token = localStorage.getItem('drms_token');
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  let res;
  try {
    res = await fetch(`${BASE_URL}/geocode/reverse?${params.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error('Cannot reach the geocoding service. Check the backend connection.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Reverse geocoding failed');
  }
  return data;
}

export function pickAdminFields(geocoded = {}) {
  const fields = {};
  if (geocoded.division) fields.division = geocoded.division;
  if (geocoded.district) fields.district = geocoded.district;
  if (geocoded.upazila) fields.upazila = geocoded.upazila;
  if (geocoded.union) fields.union = geocoded.union;
  if (geocoded.address) fields.address = geocoded.address;
  return fields;
}
