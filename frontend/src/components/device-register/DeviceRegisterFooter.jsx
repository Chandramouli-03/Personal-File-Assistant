export default function DeviceRegisterFooter() {
  return (
    <footer className="flex flex-col items-center gap-4 py-6 border-t border-slate-100 dark:border-slate-800">
      <p className="text-slate-500 dark:text-slate-400 text-sm">Having trouble connecting?</p>
      <div className="flex gap-4">
        <a href="#" className="text-primary text-sm font-semibold hover:underline">
          View FAQ
        </a>
        <span className="text-slate-300">|</span>
        <a href="#" className="text-primary text-sm font-semibold hover:underline">
          Contact Support
        </a>
      </div>
    </footer>
  );
}
