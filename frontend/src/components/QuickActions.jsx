import { MdDescription, MdImage, MdReceiptLong, MdVideoLibrary } from 'react-icons/md';

export default function QuickActions() {
  const quickActionItems = [
    {
      icon: <MdDescription />,
      label: 'Resumes',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    },
    {
      icon: <MdImage />,
      label: 'Latest Photos',
      bgClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
    },
    {
      icon: <MdReceiptLong />,
      label: 'Tax Docs',
      bgClass: 'bg-green-100 dark:bg-green-900/30 text-green-600',
    },
    {
      icon: <MdVideoLibrary />,
      label: 'Videos',
      bgClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4">
        {quickActionItems.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors cursor-pointer flex items-center gap-3"
          >
            <div className={`p-2 ${item.bgClass} rounded-lg`}>
              {item.icon}
            </div>
            <span className="text-sm font-semibold">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
