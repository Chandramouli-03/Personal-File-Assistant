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

/**
 * Browse files on a device with folder navigation
 */
export async function browseFiles(deviceId, options = {}) {
  const { folderPath = '', fileType = null, search = null, page = 1, pageSize = 50 } = options;

  return request('/files/browse', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId,
      folder_path: folderPath,
      file_type: fileType,
      search,
      page,
      page_size: pageSize,
    }),
  });
}

/**
 * Upload file to device
 */
export async function uploadFile(deviceId, file, targetPath = '', onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('device_id', deviceId);
  if (targetPath) formData.append('target_path', targetPath);

  const url = `${API_BASE}/files/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error('Invalid response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.detail || 'Upload failed'));
        } catch (e) {
          reject(new Error('Upload failed'));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

// ============================================
// Device Registration (QR Code)
// ============================================

/**
 * Get QR code data for device registration
 * Note: This endpoint is at /register/qr (not under /api)
 */
export async function getQRData() {
  const response = await fetch('/register/qr');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// ============================================
// Health Check
// ============================================

/**
 * Check server health
 * Note: This endpoint is at /health (not under /api)
 */
export async function checkHealth() {
  const response = await fetch('/health');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// ============================================
// Device Pairing
// ============================================

/**
 * Create a new pairing session
 * @param {string} deviceType - Device type: 'linux', 'windows', 'mobile'
 */
export async function createPairing(deviceType) {
  return request('/pairing', {
    method: 'POST',
    body: JSON.stringify({ device_type: deviceType }),
  });
}

/**
 * Get pairing session status
 * @param {string} code - Pairing code
 */
export async function getPairingStatus(code) {
  return request(`/pairing/${code}`);
}

/**
 * Complete pairing from secondary device
 * @param {string} code - Pairing code
 * @param {object} data - Device data { name, scan_paths, os_type }
 */
export async function completePairing(code, data) {
  return request(`/pairing/${code}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Cancel a pairing session
 * @param {string} code - Pairing code
 */
export async function cancelPairing(code) {
  return request(`/pairing/${code}`, {
    method: 'DELETE',
  });
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
  browseFiles,
  uploadFile,

  // Registration
  getQRData,

  // Pairing
  createPairing,
  getPairingStatus,
  completePairing,
  cancelPairing,

  // Health
  checkHealth,
};
