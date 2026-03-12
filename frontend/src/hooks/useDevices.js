import { useState, useEffect, useCallback } from 'react';
import { getDevices, getLocalDevice, deleteDevice, registerDevice } from '../services/api';
import { timeAgo, getOsDisplay } from '../utils/format';

/**
 * Custom hook for device management
 * @param {Object} options - Hook options
 * @param {number} options.refreshInterval - Auto-refresh interval in ms (default: 30000)
 * @returns {Object} Device state and methods
 */
export function useDevices(options = {}) {
  const { refreshInterval = 5000 } = options;

  const [devices, setDevices] = useState([]);
  const [localDevice, setLocalDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Map backend device to frontend format
   */
  const mapDevice = useCallback((device) => ({
    id: device.id,
    name: device.name,
    os: getOsDisplay(device.os),
    lastSync: timeAgo(device.last_heartbeat),
    status: device.status || 'offline',
    type: device.os?.toLowerCase() || 'unknown',
    mode: device.mode || 'agent',
    fileCount: device.file_count || 0,
    url: device.url || '',
  }), []);

  /**
   * Fetch all devices
   */
  const fetchDevices = useCallback(async () => {
    try {
      setError(null);
      const data = await getDevices();
      setDevices(data.map(mapDevice));
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      setError(err.message);
    }
  }, [mapDevice]);

  /**
   * Fetch local device info
   */
  const fetchLocalDevice = useCallback(async () => {
    try {
      const data = await getLocalDevice();
      setLocalDevice(mapDevice(data));
    } catch (err) {
      console.error('Failed to fetch local device:', err);
    }
  }, [mapDevice]);

  /**
   * Refresh all device data
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchDevices(), fetchLocalDevice()]);
    setLoading(false);
  }, [fetchDevices, fetchLocalDevice]);

  /**
   * Remove a device
   */
  const removeDevice = useCallback(async (deviceId) => {
    try {
      await deleteDevice(deviceId);
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      return true;
    } catch (err) {
      console.error('Failed to remove device:', err);
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Add a new device
   */
  const addDevice = useCallback(async (deviceData) => {
    try {
      const newDevice = await registerDevice(deviceData);
      setDevices(prev => [...prev, mapDevice(newDevice)]);
      return newDevice;
    } catch (err) {
      console.error('Failed to add device:', err);
      setError(err.message);
      return null;
    }
  }, [mapDevice]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchDevices, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchDevices]);

  return {
    devices,
    localDevice,
    loading,
    error,
    refresh,
    removeDevice,
    addDevice,
  };
}

export default useDevices;
