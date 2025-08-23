const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function getToken() {
  return localStorage.getItem('token') || '';
}

export function setToken(t) {
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || `Request failed: ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  auth: {
    googleStart() {
      window.location.href = `${API_BASE}/api/auth/google`;
    },
  },
  games: {
    list() { return request('/api/games'); },
    create(data) { return request('/api/games', { method: 'POST', body: data }); },
    update(id, data) { return request(`/api/games/${id}`, { method: 'PUT', body: data }); },
    delete(id) { return request(`/api/games/${id}`, { method: 'DELETE' }); },
  },
};

export default api;
