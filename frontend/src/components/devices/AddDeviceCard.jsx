import { MdAdd } from 'react-icons/md';

export default function AddDeviceCard({ onAddDevice }) {
  return (
    <div
      onClick={onAddDevice}
      className="border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
    >
      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-primary/20 group-hover:text-primary rounded-full flex items-center justify-center transition-colors">
        <MdAdd className="text-3xl" />
      </div>
      <div className="text-center">
        <p className="font-bold text-slate-900 dark:text-white">Add New Device</p>
        <p className="text-xs text-slate-500">Connect a new hardware</p>
      </div>
    </div>
  );
}
