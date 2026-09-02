const BASE_URL = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('drms_token');

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot reach the API server. Make sure "npm run dev" is running and the backend is fully started.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong talking to the server');
  }

  return data;
}

export const registerUser = (payload) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });

export const loginUser = (payload) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });

export const fetchMe = () => request('/auth/me');

export const createDisaster = (payload) =>
  request('/disasters', { method: 'POST', body: JSON.stringify(payload) });

export const fetchDisasters = () => request('/disasters');

export const updateDisasterStatus = (id, status) =>
  request(`/disasters/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const fetchShelters = () => request('/shelters');

export const createShelter = (payload) =>
  request('/shelters', { method: 'POST', body: JSON.stringify(payload) });

export const updateShelter = (id, payload) =>
  request(`/shelters/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteShelter = (id) =>
  request(`/shelters/${id}`, { method: 'DELETE' });

export const fetchWarehouses = () => request('/warehouses');

export const createWarehouse = (payload) =>
  request('/warehouses', { method: 'POST', body: JSON.stringify(payload) });

export const updateWarehouse = (id, payload) =>
  request(`/warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteWarehouse = (id) =>
  request(`/warehouses/${id}`, { method: 'DELETE' });

export const fetchItems = () => request('/items');

export const createItem = (payload) =>
  request('/items', { method: 'POST', body: JSON.stringify(payload) });

export const updateItem = (id, payload) =>
  request(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteItem = (id) =>
  request(`/items/${id}`, { method: 'DELETE' });

export const fetchVictims = () => request('/victims');

export const createVictim = (payload) =>
  request('/victims', { method: 'POST', body: JSON.stringify(payload) });

export const updateVictim = (id, payload) =>
  request(`/victims/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteVictim = (id) =>
  request(`/victims/${id}`, { method: 'DELETE' });

export const fetchInventory = () => request('/inventory');

export const adjustInventory = (payload) =>
  request('/inventory/adjust', { method: 'POST', body: JSON.stringify(payload) });

export const deleteInventory = (id) =>
  request(`/inventory/${id}`, { method: 'DELETE' });

export const fetchVolunteers = () => request('/users/volunteers');

export const createTeam = (payload) =>
  request('/teams', { method: 'POST', body: JSON.stringify(payload) });

export const fetchMyTeams = () => request('/teams/mine');

export const fetchPendingTeams = () => request('/teams/pending');

export const fetchAllTeams = () => request('/teams');

export const reviewTeam = (id, action, remark = '') =>
  request(`/teams/${id}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ remark }),
  });

export const resignFromTeam = (teamId) =>
  request(`/teams/${teamId}/members/me`, { method: 'DELETE' });

export const disbandTeam = (teamId) =>
  request(`/teams/${teamId}`, { method: 'DELETE' });

export const createDonation = (payload) =>
  request('/donations', { method: 'POST', body: JSON.stringify(payload) });

export const fetchMyDonations = () => request('/donations/mine');

export const fetchDonations = () => request('/donations');

export const fetchDonation = (id) => request(`/donations/${id}`);

export const createReliefRequest = (payload) =>
  request('/relief-requests', { method: 'POST', body: JSON.stringify(payload) });

export const fetchReliefRequests = () => request('/relief-requests');

export const fetchReliefRequest = (id) => request(`/relief-requests/${id}`);

export const updateReliefRequestStatus = (id, status) =>
  request(`/relief-requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const updateReliefRequestItem = (requestId, itemId, quantityDispatched) =>
  request(`/relief-requests/${requestId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity_dispatched: quantityDispatched }),
  });
