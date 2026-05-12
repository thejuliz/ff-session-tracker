const API_BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || res.statusText);
  }
  return res.json();
}

// Packages
export function getPackages() {
  return request("/packages");
}

export function createPackage(data) {
  return request("/packages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deletePackage(id) {
  return request(`/packages/${id}`, { method: "DELETE" });
}

// Sessions
export function getSessions(limit = 50, offset = 0) {
  return request(`/sessions?limit=${limit}&offset=${offset}`);
}

export function createSession(data) {
  return request("/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteSession(id) {
  return request(`/sessions/${id}`, { method: "DELETE" });
}

export function updateSession(id, data) {
  return request(`/sessions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Stats
export function getStats() {
  return request("/stats");
}
