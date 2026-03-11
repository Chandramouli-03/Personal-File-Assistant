import { MdPictureAsPdf, MdImage, MdTableChart } from 'react-icons/md';

export default function RecentActivity() {
  const recentItems = [
    {
      icon: <MdPictureAsPdf />,
      name: 'Design_Proposal_v2.pdf',
      source: 'Synced from MacBook Pro',
      time: '2m ago',
    },
    {
      icon: <MdImage />,
      name: 'IMG_8422.heic',
      source: 'Synced from iPhone 15',
      time: '15m ago',
    },
    {
      icon: <MdTableChart />,
      name: 'Budget_2024.xlsx',
      source: 'Synced from Google Drive',
      time: '1h ago',
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Recent Activity</h2>
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {recentItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${
              index !== recentItems.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-slate-400">{item.icon}</span>
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-slate-500">{item.source}</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
