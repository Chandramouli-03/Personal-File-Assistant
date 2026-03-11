import { MdFolderShared, MdHome, MdDevices, MdCloudDone, MdHistory, MdSettings, MdFolder, MdSwapHoriz } from 'react-icons/md';

export default function Sidebar({ currentPage = 'home', onNavigate }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: MdHome },
    { id: 'files', label: 'My Files', icon: MdFolder },
    { id: 'devices', label: 'Devices', icon: MdDevices },
    { id: 'transfers', label: 'Transfers', icon: MdSwapHoriz },
    { id: 'settings', label: 'Settings', icon: MdSettings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark overflow-y-auto">
      <div className="flex flex-col h-full p-4 gap-6">
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-2">
          <div className="bg-primary rounded-lg p-2 text-white">
            <MdFolderShared />
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-none">FileStream</h1>
            <p className="text-primary text-xs font-medium">Cross-device sync</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentPage === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Sidebar Content */}
        {/* <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Storage Usage</p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mb-2">
              <div className="bg-primary h-2 rounded-full w-[65%]"></div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">16.2 GB of 25 GB used</p>
          </div>
        </div> */}
      </div>
    </aside>
  );
}
