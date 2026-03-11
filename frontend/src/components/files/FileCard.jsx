import {
  MdDescription,
  MdImage,
  MdMovie,
  MdAudiotrack,
  MdArchive,
  MdCode,
  MdInsertDriveFile,
  MdDownload,
  MdDeleteOutline,
} from 'react-icons/md';

const FILE_ICONS = {
  document: { icon: MdDescription, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
  image: { icon: MdImage, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
  video: { icon: MdMovie, color: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
  audio: { icon: MdAudiotrack, color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  archive: { icon: MdArchive, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
  code: { icon: MdCode, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600' },
  data: { icon: MdInsertDriveFile, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600' },
  other: { icon: MdInsertDriveFile, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600' },
};

export default function FileCard({ file, onDownload, onDelete, viewMode = 'grid' }) {
  const iconConfig = FILE_ICONS[file.fileType] || FILE_ICONS.other;
  const Icon = iconConfig.icon;

  const handleDownload = (e) => {
    e.stopPropagation();
    onDownload?.(file);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(file);
  };

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
        <div className={`w-10 h-10 ${iconConfig.color} rounded-lg flex items-center justify-center shrink-0`}>
          <Icon className="text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 dark:text-white truncate">{file.name}</h3>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 w-20 text-right shrink-0">
          {file.extension?.toUpperCase() || '-'}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 w-24 text-right shrink-0">
          {file.sizeDisplay}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 w-32 text-right shrink-0">
          {file.modifiedDisplay}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {onDownload && (
            <button
              onClick={handleDownload}
              className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Download"
            >
              <MdDownload />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Delete"
            >
              <MdDeleteOutline />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 ${iconConfig.color} rounded-xl flex items-center justify-center`}>
          <Icon className="text-2xl" />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDownload && (
            <button
              onClick={handleDownload}
              className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Download"
            >
              <MdDownload />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Delete"
            >
              <MdDeleteOutline />
            </button>
          )}
        </div>
      </div>
      <h3 className="font-medium text-slate-900 dark:text-white truncate mb-1 group-hover:text-primary transition-colors">
        {file.name}
      </h3>
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{file.sizeDisplay}</span>
        <span>{file.modifiedDisplay}</span>
      </div>
    </div>
  );
}
