import { useState, useEffect, useCallback } from 'react';
import { useFiles } from '../hooks/useFiles';
import { useDevices } from '../hooks/useDevices';
import FilesHeader from '../components/files/FilesHeader';
import FileBrowser from '../components/files/FileBrowser';
import UploadDropzone from '../components/files/UploadDropzone';

export default function MyFiles() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('filesViewMode') || 'grid');

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

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <FilesHeader
        devices={devices}
        selectedDevice={selectedDevice}
        onDeviceChange={handleDeviceChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        fileTypeFilter={fileTypeFilter}
        onFileTypeFilterChange={setFileTypeFilter}
        onRefresh={handleRefresh}
        loading={loading}
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
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onUploadClick={() => setShowUploadModal(true)}
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
    </main>
  );
}
