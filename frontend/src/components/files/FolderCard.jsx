import { MdFolder, MdChevronRight } from 'react-icons/md';

export default function FolderCard({ name, path, fileCount, totalSizeDisplay, onClick }) {
  return (
    <button
      onClick={() => onClick(path)}
      className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all group flex items-center gap-4 text-left"
    >
      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
        <MdFolder className="text-2xl" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {fileCount} file{fileCount !== 1 ? 's' : ''} • {totalSizeDisplay}
        </p>
      </div>
      <MdChevronRight className="text-slate-400 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}
