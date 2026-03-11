import { useState, useMemo } from 'react';
import DeviceCard from '../components/devices/DeviceCard';
import AddDeviceCard from '../components/devices/AddDeviceCard';
import DevicesHeader from '../components/devices/DevicesHeader';
import DevicesTopActions from '../components/devices/DevicesTopActions';
import DeviceFilters from '../components/devices/DeviceFilters';
import SecurityInfo from '../components/devices/SecurityInfo';
import { useDevices } from '../hooks/useDevices';

export default function Devices({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Use the devices hook to fetch real data
  const { devices, localDevice, loading, error, refresh, removeDevice } = useDevices();

  // Combine local device with remote devices
  const allDevices = useMemo(() => {
    const combined = [...devices];
    if (localDevice && !combined.find(d => d.id === localDevice.id)) {
      combined.unshift(localDevice);
    }
    return combined;
  }, [devices, localDevice]);

  // Filter devices based on search and filter
  const filteredDevices = useMemo(() => {
    return allDevices.filter((device) => {
      const matchesSearch =
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.os.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.status.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'mobile' && ['iphone', 'android', 'android'].includes(device.type)) ||
        (activeFilter === 'desktop' && ['windows', 'mac', 'macos', 'linux'].includes(device.type));

      return matchesSearch && matchesFilter;
    });
  }, [allDevices, searchTerm, activeFilter]);

  const handleAddDevice = () => {
    onNavigate?.('device-register');
  };

  const handleRemoveDevice = async (deviceId) => {
    if (window.confirm('Are you sure you want to remove this device?')) {
      await removeDevice(deviceId);
    }
  };

  const handleRefresh = () => {
    refresh();
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <DevicesHeader />

      {/* Error Banner */}
      {error && (
        <div className="px-8 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">
            Failed to load devices: {error}
            <button
              onClick={handleRefresh}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </p>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark/50">
        <div className="px-8 space-y-8">
          <DevicesTopActions
            onAddDevice={handleAddDevice}
            onRefresh={handleRefresh}
            loading={loading}
          />
          <DeviceFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />

          {/* Loading State */}
          {loading && filteredDevices.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400">Loading devices...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredDevices.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchTerm || activeFilter !== 'all'
                  ? 'No devices match your filters'
                  : 'No devices connected yet'}
              </p>
              <button
                onClick={handleAddDevice}
                className="text-primary hover:underline"
              >
                Add your first device
              </button>
            </div>
          )}

          {/* Devices Grid */}
          {filteredDevices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  {...device}
                  onRemove={() => handleRemoveDevice(device.id)}
                />
              ))}
              <AddDeviceCard onAddDevice={handleAddDevice} />
            </div>
          )}

          <SecurityInfo />
        </div>
      </div>
    </main>
  );
}
