const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('drms_token');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

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
