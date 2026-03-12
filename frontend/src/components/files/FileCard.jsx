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
  MdVisibility,
  MdPictureAsPdf,
  MdTableChart,
} from 'react-icons/md';

const FILE_ICONS = {
  document: { icon: MdDescription, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
  image: { icon: MdImage, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
  video: { icon: MdMovie, color: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
  audio: { icon: MdAudiotrack, color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  archive: { icon: MdArchive, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
  code: { icon: MdCode, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600' },
  data: { icon: MdInsertDriveFile, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600' },
  pdf: { icon: MdPictureAsPdf, color: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
  spreadsheet: { icon: MdTableChart, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' },
  other: { icon: MdInsertDriveFile, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600' },
};

// File types that can be previewed
const PREVIEWABLE_TYPES = {
  text: ['txt', 'md', 'log'],
  code: ['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'],
  pdf: ['pdf'],
  csv: ['csv'],
  document: ['doc', 'docx', 'odt'],
  spreadsheet: ['xls', 'xlsx', 'ods'],
};

const canPreview = (file) => {
  const ext = file.extension?.toLowerCase().replace('.', '') || '';
  return PREVIEWABLE_TYPES.text.includes(ext) ||
         PREVIEWABLE_TYPES.code.includes(ext) ||
         PREVIEWABLE_TYPES.image.includes(ext) ||
         PREVIEWABLE_TYPES.pdf.includes(ext) ||
         PREVIEWABLE_TYPES.csv.includes(ext) ||
         PREVIEWABLE_TYPES.document.includes(ext) ||
         PREVIEWABLE_TYPES.spreadsheet.includes(ext);
};

export default function FileCard({ file, onDownload, onDelete, onPreview, viewMode = 'grid' }) {
  // Get icon based on fileType, with special handling for PDF and CSV files
  const ext = file.extension?.toLowerCase().replace('.', '') || '';
  let iconConfig = FILE_ICONS[file.fileType] || FILE_ICONS.other;

  // Override icon for PDF and spreadsheet files
  if (ext === 'pdf') {
    iconConfig = FILE_ICONS.pdf;
  } else if (PREVIEWABLE_TYPES.spreadsheet.includes(ext)) {
    iconConfig = FILE_ICONS.spreadsheet;
  }

  const Icon = iconConfig.icon;
  const previewable = canPreview(file);

  const handleDownload = (e) => {
    e.stopPropagation();
    onDownload?.(file);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(file);
  };

  const handlePreview = (e) => {
    e?.stopPropagation();
    if (previewable) {
      onPreview?.(file);
    }
  };

  const handleCardClick = () => {
    if (previewable) {
      onPreview?.(file);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className={`flex items-center gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${
          previewable ? 'cursor-pointer' : ''
        }`}
      >
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
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {previewable && (
            <button
              onClick={handlePreview}
              className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Preview"
            >
              <MdVisibility />
            </button>
          )}
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
    <div
      onClick={handleCardClick}
      className={`bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow group ${
        previewable ? 'cursor-pointer hover:border-primary/50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 ${iconConfig.color} rounded-xl flex items-center justify-center`}>
          <Icon className="text-2xl" />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {previewable && (
            <button
              onClick={handlePreview}
              className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Preview"
            >
              <MdVisibility />
            </button>
          )}
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
