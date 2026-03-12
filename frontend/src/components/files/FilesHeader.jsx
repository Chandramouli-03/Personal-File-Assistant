import { MdFolder, MdNotifications, MdPerson, MdRefresh, MdSearch } from 'react-icons/md';

const FILE_TYPES = [
  { value: 'all', label: 'All Files' },
  { value: 'document', label: 'Documents' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'archive', label: 'Archives' },
  { value: 'code', label: 'Code' },
];

export default function FilesHeader({
  devices,
  selectedDevice,
  onDeviceChange,
  searchTerm,
  onSearchChange,
  fileTypeFilter,
  onFileTypeFilterChange,
  onRefresh,
  loading,
}) {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark shrink-0">
      {/* Top row - Title and actions */}
      <div className="h-16 flex items-center justify-between px-8">
        <div className="flex items-center gap-2">
          <MdFolder className="text-primary text-xl" />
          <h2 className="text-slate-900 dark:text-white text-lg font-bold">My Files</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <MdRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
            <MdNotifications />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
            <MdPerson className="text-sm" />
          </div>
        </div>
      </div>

      {/* Second row - Filters */}
      <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center gap-4">
        {/* Device selector */}
        <select
          value={selectedDevice || ''}
          onChange={(e) => onDeviceChange(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Select a device</option>
          {devices?.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>

        {/* Search input */}
        <div className="flex-1 min-w-[200px] max-w-md relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* File type filter */}
        <select
          value={fileTypeFilter}
          onChange={(e) => onFileTypeFilterChange(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {FILE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
