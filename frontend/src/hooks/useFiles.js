import { useState, useCallback } from 'react';
import { browseFiles, uploadFile as uploadFileApi, getFileDownloadUrl } from '../services/api';
import { formatSize, timeAgo, getFileExtension } from '../utils/format';

/**
 * Custom hook for file browsing and management
 * @param {Object} options - Hook options
 * @returns {Object} File state and methods
 */
export function useFiles(options = {}) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pageSize: 50, hasMore: false });
  const [uploadProgress, setUploadProgress] = useState(null);

  /**
   * Map backend file to frontend format
   */
  const mapFile = useCallback((file) => ({
    id: file.id,
    name: file.name,
    path: file.path,
    relativePath: file.relative_path,
    extension: file.extension,
    fileType: file.file_type,
    size: file.size,
    sizeDisplay: formatSize(file.size),
    modifiedTime: file.modified_time,
    modifiedDisplay: timeAgo(file.modified_time),
    createdTime: file.created_time,
    deviceId: file.device_id,
    scanRoot: file.scan_root,
    previewText: file.preview_text,
  }), []);

  /**
   * Map backend folder to frontend format
   */
  const mapFolder = useCallback((folder) => ({
    name: folder.name,
    path: folder.path,
    fileCount: folder.file_count,
    totalSize: folder.total_size,
    totalSizeDisplay: formatSize(folder.total_size),
  }), []);

  /**
   * Fetch files from a device
   */
  const fetchFiles = useCallback(async (deviceId, folderPath = '', opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await browseFiles(deviceId, {
        device_id: deviceId,
        folder_path: folderPath,
        folderPath,
        fileType: opts.fileType,
        search: opts.search,
        page: opts.page || 1,
        pageSize: opts.pageSize || 50,
      });

      setFiles((result.files || []).map(mapFile));
      setFolders((result.folders || []).map(mapFolder));
      setPagination({
        page: result.page,
        total: result.total,
        pageSize: result.page_size,
        hasMore: result.has_more,
      });
      setCurrentPath(result.current_path || folderPath);

      return result;
    } catch (err) {
      console.error('Failed to fetch files:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mapFile, mapFolder]);

  /**
   * Upload a file to a device
   */
  const uploadFile = useCallback(async (deviceId, file, targetPath = '') => {
    setUploadProgress({ fileName: file.name, progress: 0, status: 'uploading' });
    try {
      const result = await uploadFileApi(deviceId, file, targetPath, (progress) => {
        setUploadProgress({ fileName: file.name, progress, status: 'uploading' });
      });
      setUploadProgress({ fileName: file.name, progress: 100, status: 'complete' });
      // Clear progress after 2 seconds
      setTimeout(() => setUploadProgress(null), 2000);
      return result;
    } catch (err) {
      console.error('Failed to upload file:', err);
      setUploadProgress({ fileName: file.name, progress: 0, status: 'error', error: err.message });
      throw err;
    }
  }, []);

  /**
   * Get download URL for a file
   */
  const getDownloadUrl = useCallback((filePath) => {
    return getFileDownloadUrl(filePath);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setFiles([]);
    setFolders([]);
    setLoading(false);
    setError(null);
    setCurrentPath('');
    setPagination({ page: 1, total: 0, pageSize: 50, hasMore: false });
    setUploadProgress(null);
  }, []);

  return {
    files,
    folders,
    loading,
    error,
    currentPath,
    pagination,
    uploadProgress,
    fetchFiles,
    uploadFile,
    getDownloadUrl,
    clearError,
    reset,
  };
}

export default useFiles;
