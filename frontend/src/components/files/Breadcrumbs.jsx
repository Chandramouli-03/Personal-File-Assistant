import { MdChevronRight, MdHome } from 'react-icons/md';

export default function Breadcrumbs({ currentPath, onNavigate }) {
  // Split path into parts
  const parts = currentPath ? currentPath.split('/').filter(Boolean) : [];

  const handleClick = (index) => {
    if (index === -1) {
      onNavigate('');
    } else {
      const newPath = parts.slice(0, index + 1).join('/');
      onNavigate(newPath);
    }
  };

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 py-2 px-4 bg-white">
      <button
        onClick={() => handleClick(-1)}
        className="flex items-center gap-1 hover:text-primary transition-colors"
      >
        <MdHome className="text-lg" />
        <span>Root</span>
      </button>
      {parts.map((part, index) => (
        <div key={index} className="flex items-center gap-1">
          <MdChevronRight className="text-slate-300 dark:text-slate-600" />
          <button
            onClick={() => handleClick(index)}
            className={`hover:text-primary transition-colors ${
              index === parts.length - 1 ? 'text-slate-900 dark:text-white font-medium' : ''
            }`}
          >
            {part}
          </button>
        </div>
      ))}
    </nav>
  );
}
