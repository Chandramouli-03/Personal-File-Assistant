/**
 * API Service Layer
 * Centralized API client for backend communication
 */

const API_BASE = '/api';

/**
 * Helper function for API requests
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : endpoint;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const response = await fetch(url, mergedOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Device Endpoints
// ============================================

/**
 * Get all registered devices
 */
export async function getDevices() {
  const data = await request('/devices');
  return data.devices || [];
}

/**
 * Get local device info
 */
export async function getLocalDevice() {
  return request('/devices/local');
}

/**
 * Register a new device
 */
export async function registerDevice(deviceData) {
  return request('/devices/register', {
    method: 'POST',
    body: JSON.stringify(deviceData),
  });
}

/**
 * Unregister/remove a device
 */
export async function deleteDevice(deviceId) {
  return request(`/devices/${deviceId}`, {
    method: 'DELETE',
  });
}

/**
 * Send device heartbeat
 */
export async function sendHeartbeat(heartbeatData) {
  return request('/devices/heartbeat', {
    method: 'POST',
    body: JSON.stringify(heartbeatData),
  });
}

/**
 * Get discovered devices (via UDP broadcast)
 */
export async function getDiscoveredDevices() {
  const data = await request('/devices/discovered');
  return data.devices || [];
}

// ============================================
// Search Endpoints
// ============================================

/**
 * Search files using AI
 */
export async function searchFiles(query, options = {}) {
  const { fileTypes, devices, maxResults = 50 } = options;

  return request('/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      file_types: fileTypes,
      devices,
      max_results: maxResults,
    }),
  });
}

/**
 * Search only local files
 */
export async function searchLocalFiles(query, options = {}) {
  const { fileTypes, maxResults = 50 } = options;

  return request('/search/local', {
    method: 'POST',
    body: JSON.stringify({
      query,
      file_types: fileTypes,
      max_results: maxResults,
    }),
  });
}

/**
 * Get search suggestions
 */
export async function getSearchSuggestions(query, limit = 5) {
  const params = new URLSearchParams({ query, limit });
  return request(`/search/suggestions?${params}`);
}

// ============================================
// File Endpoints
// ============================================

/**
 * Get file scanning statistics
 */
export async function getFileStats() {
  return request('/files/stats');
}

/**
 * Read file content
 */
export async function readFile(deviceId, filePath, maxChars = 10000) {
  return request('/files/read', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId,
      file_path: filePath,
      max_chars: maxChars,
    }),
  });
}

/**
 * Get file info
 */
export async function getFileInfo(path) {
  const params = new URLSearchParams({ path });
  return request(`/files/info?${params}`);
}

/**
 * Get file download URL
 */
export function getFileDownloadUrl(path) {
  return `${API_BASE}/files/download?path=${encodeURIComponent(path)}`;
}

/**
 * Copy file between devices
 */
export async function copyFile(sourceDeviceId, sourcePath, targetDeviceId, targetPath) {
  return request('/files/copy', {
    method: 'POST',
    body: JSON.stringify({
      source_device_id: sourceDeviceId,
      source_path: sourcePath,
      target_device_id: targetDeviceId,
      target_path: targetPath,
    }),
  });
}

/**
 * Trigger file rescan
 */
export async function rescanFiles() {
  return request('/files/rescan', {
    method: 'POST',
  });
}

// ============================================
// Device Registration (QR Code)
// ============================================

/**
 * Get QR code data for device registration
 */
export async function getQRData() {
  return request('/register/qr');
}

// ============================================
// Health Check
// ============================================

/**
 * Check server health
 */
export async function checkHealth() {
  return request('/health');
}

// ============================================
// Export all as named exports
// ============================================
export default {
  // Devices
  getDevices,
  getLocalDevice,
  registerDevice,
  deleteDevice,
  sendHeartbeat,
  getDiscoveredDevices,

  // Search
  searchFiles,
  searchLocalFiles,
  getSearchSuggestions,

  // Files
  getFileStats,
  readFile,
  getFileInfo,
  getFileDownloadUrl,
  copyFile,
  rescanFiles,

  // Registration
  getQRData,

  // Health
  checkHealth,
};
