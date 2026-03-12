import { useState, useEffect, useCallback } from 'react';
import { MdFolder, MdSearch } from 'react-icons/md';
import { useFiles } from '../hooks/useFiles';
import { useDevices } from '../hooks/useDevices';
import PageHeader from '../components/common/PageHeader';
import FileBrowser from '../components/files/FileBrowser';
import UploadDropzone from '../components/files/UploadDropzone';
import FilePreviewModal from '../components/files/FilePreviewModal';

const FILE_TYPES = [
  { value: 'all', label: 'All Files' },
  { value: 'document', label: 'Documents' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'archive', label: 'Archives' },
  { value: 'code', label: 'Code' },
];

export default function MyFiles() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('filesViewMode') || 'grid');
  const [previewFile, setPreviewFile] = useState(null);

  const { devices, loading: devicesLoading } = useDevices();
  const {
    files,
    folders,
    loading: filesLoading,
    error,
    currentPath,
    pagination,
    uploadProgress,
    fetchFiles,
    uploadFile,
    getDownloadUrl,
    clearError,
  } = useFiles();

  const loading = devicesLoading || filesLoading;

  // Auto-select first device on mount
  useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0].id);
    }
  }, [devices, selectedDevice]);

  // Fetch files when device or folder changes
  useEffect(() => {
    if (selectedDevice) {
      fetchFiles(selectedDevice, currentFolder, {
        search: searchTerm || undefined,
        fileType: fileTypeFilter !== 'all' ? fileTypeFilter : undefined,
      });
    }
  }, [selectedDevice, currentFolder, searchTerm, fileTypeFilter, fetchFiles]);

  // Debounced search
  useEffect(() => {
    if (!selectedDevice) return;

    const timer = setTimeout(() => {
      fetchFiles(selectedDevice, currentFolder, {
        search: searchTerm || undefined,
        fileType: fileTypeFilter !== 'all' ? fileTypeFilter : undefined,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleDeviceChange = (deviceId) => {
    setSelectedDevice(deviceId);
    setCurrentFolder('');
    setSearchTerm('');
    setFileTypeFilter('all');
  };

  const handleFolderClick = (folderPath) => {
    setCurrentFolder(folderPath);
  };

  const handleBreadcrumbClick = (folderPath) => {
    setCurrentFolder(folderPath);
  };

  const handleRefresh = useCallback(() => {
    if (selectedDevice) {
      fetchFiles(selectedDevice, currentFolder, {
        search: searchTerm || undefined,
        fileType: fileTypeFilter !== 'all' ? fileTypeFilter : undefined,
      });
    }
  }, [selectedDevice, currentFolder, searchTerm, fileTypeFilter, fetchFiles]);

  const handleFileDownload = useCallback((file) => {
    const url = getDownloadUrl(file.path);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [getDownloadUrl]);

  const handleFileDelete = useCallback((file) => {
    // TODO: Implement file deletion
    console.log('Delete file:', file);
  }, []);

  const handleUpload = useCallback(async (file, targetPath) => {
    if (!selectedDevice) return;
    try {
      await uploadFile(selectedDevice, file, targetPath);
      // Refresh the file list after upload
      handleRefresh();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }, [selectedDevice, uploadFile, handleRefresh]);

  const handleFilePreview = useCallback((file) => {
    setPreviewFile(file);
  }, []);

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="My Files"
        icon={MdFolder}
        showRefresh
        onRefresh={handleRefresh}
        refreshLoading={loading}
        secondaryContent={
          <>
            {/* Device selector */}
            <select
              value={selectedDevice || ''}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select a device</option>
              {devices?.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>

            {/* Search input */}
            <div className="flex-1 min-w-[200px] max-w-md relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* File type filter */}
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {FILE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </>
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="px-8 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">
            Failed to load files: {error}
            <button
              onClick={() => {
                clearError();
                handleRefresh();
              }}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </p>
        </div>
      )}

      {/* No device selected */}
      {!selectedDevice && !devicesLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 mb-4">Select a device to view files</p>
          </div>
        </div>
      )}

      {/* File browser */}
      {selectedDevice && (
        <FileBrowser
          files={files}
          folders={folders}
          loading={loading}
          currentPath={currentPath}
          onFolderClick={handleFolderClick}
          onBreadcrumbClick={handleBreadcrumbClick}
          onFileDownload={handleFileDownload}
          onFileDelete={handleFileDelete}
          onFilePreview={handleFilePreview}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onUploadClick={() => setShowUploadModal(true)}
          isSearching={!!searchTerm}
          onNavigateToFolder={handleBreadcrumbClick}
        />
      )}

      {/* Pagination info */}
      {selectedDevice && pagination.total > 0 && (
        <div className="px-4 py-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 text-center">
          Showing {files.length} of {pagination.total} file{pagination.total !== 1 ? 's' : ''}
          {pagination.hasMore && ' • More files available'}
        </div>
      )}

      {/* Upload modal */}
      <UploadDropzone
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        currentPath={currentPath}
        uploadProgress={uploadProgress}
      />

      {/* Preview modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        onDownload={handleFileDownload}
      />
    </main>
  );
}
