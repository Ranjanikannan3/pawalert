const API_BASE = '/api';

/**
 * Generic Fetch API client with automatic JWT token attachment
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('pawalert_token');
  const headers = {
    ...options.headers,
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // If body is not FormData, set content-type to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = data.message;
    if (!message) {
      if (response.status === 401) message = 'Invalid email or password.';
      else if (response.status === 403) message = 'You do not have permission to access this resource.';
      else if (response.status === 404) message = 'Requested resource not found.';
      else message = `API Error (${response.status}): ${response.statusText || 'Unknown Error'}`;
    }
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
  logout: () => request('/auth/logout', { method: 'POST' }).catch(() => ({})),
  getMe: () => request('/auth/me'),
  getDemoAccounts: () => request('/auth/demo-accounts'),

  // Accident Reports
  submitReport: (formData) => request('/reports', { method: 'POST', body: formData }),
  checkDuplicate: (lat, lng, animalType) =>
    request('/reports/check-duplicate', {
      method: 'POST',
      body: { latitude: lat, longitude: lng, animalType },
    }),
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports?${query}`);
  },
  getMyReports: () => request('/reports/my'),
  getReportById: (id) => request(`/reports/${id}`),
  updateReportStatus: (id, status) =>
    request(`/reports/${id}/status`, { method: 'PATCH', body: { status } }),

  // Hotspots
  getHotspots: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/hotspots?${query}`);
  },
  getHotspotById: (id) => request(`/hotspots/${id}`),
  recalculateHotspots: (config = {}) =>
    request('/hotspots/recalculate', { method: 'POST', body: config }),

  // Driver Safety HUD
  updateDriverLocation: (payload) =>
    request('/drivers/location', { method: 'POST', body: payload }),
  getNearbyHotspotsForDriver: (lat, lng, radius = 5000) =>
    request(`/drivers/nearby-hotspots?latitude=${lat}&longitude=${lng}&radius=${radius}`),

  // Rescue Operations
  getRescueRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rescue?${query}`);
  },
  getRescueRequestById: (id) => request(`/rescue/${id}`),
  updateRescueStatus: (id, payload) =>
    request(`/rescue/${id}/status`, { method: 'PATCH', body: payload }),
  assignVolunteer: (id, payload) =>
    request(`/rescue/${id}/assign`, { method: 'POST', body: payload }),

  // Authority Remediation Actions
  getAuthorityActions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/authority/actions?${query}`);
  },
  getCauseAnalysis: () => request('/authority/cause-analysis'),
  createAuthorityAction: (payload) =>
    request('/authority/actions', { method: 'POST', body: payload }),
  updateAuthorityAction: (id, payload) =>
    request(`/authority/actions/${id}`, { method: 'PATCH', body: payload }),


  // Analytics & Statistics
  getOverviewStats: () => request('/analytics/overview'),
  getAnimalBreakdown: () => request('/analytics/animals'),
  getAreaBreakdown: () => request('/analytics/areas'),
  getTrends: () => request('/analytics/trends'),

  // Notifications
  getNotifications: (role) => request(`/notifications?role=${role || 'all'}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: (role) =>
    request('/notifications/mark-all-read', { method: 'POST', body: { role } }),

  // AI Classification
  analyzeAnimalImage: (formData) =>
    request('/ai/analyze-animal', { method: 'POST', body: formData }),

  // Admin
  getSystemStatus: () => request('/admin/system-status'),
  getUsers: () => request('/admin/users'),
  updateUser: (id, payload) => request(`/admin/users/${id}`, { method: 'PATCH', body: payload }),
};

export default api;
