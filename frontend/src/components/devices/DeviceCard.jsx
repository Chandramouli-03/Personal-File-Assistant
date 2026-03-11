import { MdComputer, MdSmartphone, MdTerminal, MdPhoneAndroid, MdDeleteOutline } from 'react-icons/md';

const DEVICE_ICONS = {
  windows: MdComputer,
  mac: MdComputer,
  macos: MdComputer,
  iphone: MdSmartphone,
  linux: MdTerminal,
  android: MdPhoneAndroid,
};

const DEVICE_COLORS = {
  windows: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  mac: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
  macos: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
  iphone: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
  linux: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
  android: 'bg-green-100 dark:bg-green-900/30 text-green-600',
};

export default function DeviceCard({ name, os, lastSync, status, type, onRemove }) {
  const Icon = DEVICE_ICONS[type?.toLowerCase()] || MdComputer;
  const colorClass = DEVICE_COLORS[type?.toLowerCase()] || DEVICE_COLORS.windows;
  const isOnline = status === 'online';

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-6">
        <div className={`w-12 h-12 ${colorClass} rounded-xl flex items-center justify-center`}>
          <Icon className="text-3xl" />
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-slate-400 hover:text-red-500 transition-colors p-1"
            title="Remove Device"
          >
            <MdDeleteOutline />
          </button>
        )}
      </div>
      <div className="mb-4">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">{name}</h3>
        <p className="text-sm text-slate-500">{os} • Last sync {lastSync}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
        <span className={`text-xs font-bold uppercase tracking-wider ${isOnline ? 'text-green-600' : 'text-slate-500'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
}
