import { MdAdd, MdRefresh } from 'react-icons/md';

export default function DevicesTopActions({ onAddDevice, onRefresh, loading }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Connected Devices</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Easily sync and access files across all your hardware.</p>
      </div>
      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdRefresh className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
        <button
          onClick={onAddDevice}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
        >
          <MdAdd />
          Add New Device
        </button>
      </div>
    </div>
  );
}
