import { useState, useEffect } from 'react';
import { MdClose, MdDownload, MdDescription, MdImage, MdCode, MdInsertDriveFile } from 'react-icons/md';
import { readFile } from '../../services/api';

// File types that can be previewed
const PREVIEWABLE_TYPES = {
  text: ['txt', 'md', 'csv', 'log'],
  code: ['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
};

const getFileCategory = (extension) => {
  const ext = extension?.toLowerCase().replace('.', '') || '';
  if (PREVIEWABLE_TYPES.text.includes(ext)) return 'text';
  if (PREVIEWABLE_TYPES.code.includes(ext)) return 'code';
  if (PREVIEWABLE_TYPES.image.includes(ext)) return 'image';
  return null;
};

export default function FilePreviewModal({ file, isOpen, onClose, onDownload }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const category = file ? getFileCategory(file.extension) : null;
  const canPreview = category !== null;

  useEffect(() => {
    if (!isOpen || !file || !canPreview) return;

    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        if (category === 'image') {
          // For images, we use the preview URL directly
          setContent(`/api/files/preview/${file.id}`);
        } else {
          // For text/code files, fetch the content
          const result = await readFile(file.deviceId, file.path, 5000);
          setContent(result.content);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [isOpen, file, category, canPreview]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              {category === 'image' ? <MdImage /> :
               category === 'code' ? <MdCode /> :
               category === 'text' ? <MdDescription /> :
               <MdInsertDriveFile />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-md">
                {file.name}
              </h3>
              <p className="text-sm text-slate-500">
                {file.sizeDisplay} • {file.extension?.toUpperCase() || 'Unknown'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <MdDownload />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <MdClose className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!canPreview && (
            <div className="text-center py-12">
              <MdInsertDriveFile className="text-6xl text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                Preview not available for this file type
              </p>
              <p className="text-sm text-slate-400 mt-2">
                You can download the file to view it
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
              <p className="text-slate-500">Loading preview...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {/* Image preview */}
          {category === 'image' && content && (
            <div className="flex items-center justify-center min-h-[300px]">
              <img
                src={content}
                alt={file.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
          )}

          {/* Text/Code preview */}
          {(category === 'text' || category === 'code') && content && (
            <pre className={`p-4 rounded-lg overflow-auto text-sm ${
              category === 'code'
                ? 'bg-slate-900 text-slate-100 font-mono'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              <code>{content}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
