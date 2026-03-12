import { MdContentCopy } from 'react-icons/md';

export default function OneClickJoinSection({ shareLink = 'https://app.filestream.com/join/dv-892-x7' }) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  return (
    <section className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-primary/10 shadow-sm flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center size-8 rounded-full bg-primary text-white font-bold text-sm">2</span>
        <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">One-click Join</h2>
      </div>
      <div className="flex-1 flex flex-col justify-between gap-6">
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Share this unique link to quickly connect a computer or tablet.
        </p>
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 truncate text-slate-500 text-xs">
            {shareLink}
          </div>
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 rounded-lg h-12 bg-primary text-white font-bold hover:brightness-110 transition-all"
          >
            <MdContentCopy className="text-xl" />
            Copy Link
          </button>
          <p className="text-center text-slate-500 dark:text-slate-400 text-xs italic">
            Open this link on another device
          </p>
        </div>
      </div>
    </section>
  );
}
