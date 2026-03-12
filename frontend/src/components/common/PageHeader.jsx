import { MdNotifications, MdPerson, MdArrowBack, MdRefresh } from 'react-icons/md';

export default function PageHeader({
  title,
  icon: Icon,
  showBackButton = false,
  onBack,
  showRefresh = false,
  onRefresh,
  refreshLoading = false,
  showNotifications = true,
  showProfile = true,
  secondaryContent,
  children,
}) {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark shrink-0">
      {/* Top row - Title and actions */}
      <div className="h-16 flex items-center justify-between px-8">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={onBack}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -ml-2"
            >
              <MdArrowBack className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          )}
          {Icon && <Icon className="text-primary text-xl" />}
          <h2 className="text-slate-900 dark:text-white text-lg font-bold">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          {showRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshLoading}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <MdRefresh className={refreshLoading ? 'animate-spin' : ''} />
            </button>
          )}
          {/* {showNotifications && (
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
              <MdNotifications />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
            </button>
          )}
          {showProfile && (
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <MdPerson className="text-sm" />
            </div>
          )} */}
        </div>
      </div>

      {/* Secondary row - Filters, search, etc. */}
      {secondaryContent && (
        <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
          {secondaryContent}
        </div>
      )}

      {/* Additional children */}
      {children}
    </header>
  );
}
