import { useState } from 'react';
import DeviceCard from '../components/devices/DeviceCard';
import AddDeviceCard from '../components/devices/AddDeviceCard';
import DevicesHeader from '../components/devices/DevicesHeader';
import DevicesTopActions from '../components/devices/DevicesTopActions';
import DeviceFilters from '../components/devices/DeviceFilters';
import SecurityInfo from '../components/devices/SecurityInfo';

const MOCK_DEVICES = [
  { id: 1, name: 'Work-Station-Pro', os: 'Windows 11', lastSync: '5m ago', status: 'online', type: 'windows' },
  { id: 2, name: 'MacBook Air M2', os: 'macOS Sonoma', lastSync: '1h ago', status: 'offline', type: 'mac' },
  { id: 3, name: 'iPhone 15 Pro', os: 'iOS 17.4', lastSync: '2m ago', status: 'online', type: 'iphone' },
  { id: 4, name: 'Ubuntu-Server-X', os: 'Linux Kernel 6.5', lastSync: '10m ago', status: 'online', type: 'linux' },
  { id: 5, name: 'Pixel 8 Pro', os: 'Android 14', lastSync: 'Yesterday', status: 'offline', type: 'android' },
];

export default function Devices({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredDevices = MOCK_DEVICES.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.os.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' ||
                         (activeFilter === 'mobile' && ['iphone', 'android'].includes(device.type)) ||
                         (activeFilter === 'desktop' && ['windows', 'mac', 'linux'].includes(device.type));
    return matchesSearch && matchesFilter;
  });

  const handleAddDevice = () => {
    onNavigate?.('device-register');
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <DevicesHeader />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark/50">
        <div className="max-w-6xl mx-auto space-y-8">
          <DevicesTopActions onAddDevice={handleAddDevice} />
          <DeviceFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />

          {/* Devices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device) => (
              <DeviceCard key={device.id} {...device} />
            ))}
            <AddDeviceCard onAddDevice={handleAddDevice} />
          </div>

          <SecurityInfo />
        </div>
      </div>
    </main>
  );
}
