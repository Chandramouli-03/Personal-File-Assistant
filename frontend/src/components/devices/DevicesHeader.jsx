import { MdNotifications, MdPerson, MdDevices } from 'react-icons/md';

export default function DevicesHeader() {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-2">
        <MdDevices className="text-primary" />
        <h2 className="text-slate-900 dark:text-white text-lg font-bold">Manage Devices</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
          <MdNotifications />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
          <MdPerson className="text-sm" />
        </div>
      </div>
    </header>
  );
}
