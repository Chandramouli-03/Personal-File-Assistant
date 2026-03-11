/**
 * Utility functions for formatting data
 */

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "2.4 MB")
 */
export function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes || isNaN(bytes)) return 'Unknown';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format date to relative time (e.g., "5m ago")
 * @param {string|Date} dateStr - Date string or Date object
 * @returns {string} Relative time string
 */
export function timeAgo(dateStr) {
  if (!dateStr) return 'Unknown';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 0) return 'just now';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';

  // Older than a week, show date
  return date.toLocaleDateString();
}

/**
 * Format date to readable string
 * @param {string|Date} dateStr - Date string or Date object
 * @returns {string} Formatted date (e.g., "Jan 15, 2025")
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date with time
 * @param {string|Date} dateStr - Date string or Date object
 * @returns {string} Formatted date and time
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return 'Unknown';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension without dot
 */
export function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Get file type category from extension
 * @param {string} fileType - File type from backend
 * @returns {string} Display-friendly type
 */
export function getFileTypeDisplay(fileType) {
  const typeMap = {
    document: 'Document',
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    archive: 'Archive',
    code: 'Code',
    data: 'Data',
    other: 'File',
  };
  return typeMap[fileType] || 'File';
}

/**
 * Map backend OS type to frontend display
 * @param {string} os - Backend OS type
 * @returns {string} Display-friendly OS name
 */
export function getOsDisplay(os) {
  const osMap = {
    windows: 'Windows',
    linux: 'Linux',
    macos: 'macOS',
    android: 'Android',
    unknown: 'Unknown',
  };
  return osMap[os?.toLowerCase()] || os || 'Unknown';
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}
