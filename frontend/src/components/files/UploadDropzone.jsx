import { useState, useCallback } from 'react';
import { MdCloudUpload, MdClose, MdCheck } from 'react-icons/md';

export default function UploadDropzone({ isOpen, onClose, onUpload, currentPath, uploadProgress }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile, currentPath);
      setSelectedFile(null);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload File</h3>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <MdClose />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload progress */}
          {uploadProgress && (
            <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {uploadProgress.fileName}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {uploadProgress.progress}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    uploadProgress.status === 'error'
                      ? 'bg-red-500'
                      : uploadProgress.status === 'complete'
                      ? 'bg-green-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
              {uploadProgress.status === 'complete' && (
                <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                  <MdCheck />
                  <span className="text-sm">Upload complete!</span>
                </div>
              )}
              {uploadProgress.status === 'error' && (
                <div className="text-red-600 dark:text-red-400 text-sm mt-2">
                  {uploadProgress.error}
                </div>
              )}
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-slate-300 dark:border-slate-600 hover:border-primary/50'
            }`}
          >
            <MdCloudUpload className="text-4xl text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-300 mb-2">
              Drag and drop a file here, or
            </p>
            <label className="cursor-pointer">
              <span className="text-primary hover:underline">browse to select a file</span>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Selected file */}
          {selectedFile && !uploadProgress && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <MdCloudUpload />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <MdClose />
                </button>
              </div>
            </div>
          )}

          {/* Upload path */}
          <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Upload to: <span className="text-slate-700 dark:text-slate-300">{currentPath || 'Root'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadProgress?.status === 'uploading'}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadProgress?.status === 'uploading' ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
