import { useState } from 'react';
import {
  MdPictureAsPdf,
  MdImage,
  MdVideoFile,
  MdDescription,
  MdComputer,
  MdFolder,
  MdContentCopy,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdCircle,
} from 'react-icons/md';

const FILE_ICONS = {
  pdf: { icon: MdPictureAsPdf, color: 'text-red-500' },
  image: { icon: MdImage, color: 'text-blue-500' },
  video: { icon: MdVideoFile, color: 'text-purple-500' },
  document: { icon: MdDescription, color: 'text-yellow-600' },
  default: { icon: MdDescription, color: 'text-slate-500' },
};

export default function SearchResultItem({ result, selected, onSelect }) {
  const [copied, setCopied] = useState(false);

  const fileIcon = FILE_ICONS[result.type] || FILE_ICONS.default;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onSelect(result.id)}
          className="mt-1 flex-shrink-0"
        >
          {selected ? (
            <MdCheckCircle className="text-primary text-xl" />
          ) : (
            <MdRadioButtonUnchecked className="text-slate-300 dark:text-slate-600 text-xl hover:text-slate-400 dark:hover:text-slate-500 transition-colors" />
          )}
        </button>

        {/* File Icon */}
        <div className={`w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center ${fileIcon.color} bg-opacity-10`}>
          <fileIcon.icon className="text-2xl" />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{result.name}</h3>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {copied ? (
                <>
                  <MdCheckCircle />
                  Copied
                </>
              ) : (
                <>
                  <MdContentCopy />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-6 text-sm">
            {/* Device */}
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MdComputer className="text-base" />
              <span>{result.device}</span>
            </div>
            {/* Location */}
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MdFolder className="text-base" />
              <span className="truncate">{result.location}</span>
            </div>
            {/* Size */}
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MdCircle className="text-[6px]" />
              <span>{result.size}</span>
            </div>
          </div>
        </div>

        {/* Preview */}
        {result.preview && (
          <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
            {result.type === 'image' ? (
              <img src={result.preview} alt={result.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-slate-400 text-xs text-center px-2">Preview</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
