import { MdShield } from 'react-icons/md';

export default function SecurityInfo() {
  return (
    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
      <div className="flex-shrink-0 w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
        <MdShield className="text-primary text-3xl" />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-slate-900 dark:text-white">Device Security & Trust</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
          Each device uses end-to-end encryption for all file transfers. Removing a device will immediately revoke its access to your file stream and delete local cached metadata.
        </p>
      </div>
      <div className="flex-shrink-0">
        <button className="text-primary font-bold text-sm hover:underline">Learn more about security</button>
      </div>
    </div>
  );
}
