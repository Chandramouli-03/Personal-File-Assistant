import { useState } from 'react';
import { MdGridView, MdViewList, MdCloudUpload, MdFolder } from 'react-icons/md';
import Breadcrumbs from './Breadcrumbs';
import FolderCard from './FolderCard';
import FileCard from './FileCard';

export default function FileBrowser({
  files,
  folders,
  loading,
  currentPath,
  onFolderClick,
  onBreadcrumbClick,
  onFileDownload,
  onFileDelete,
  onFilePreview,
  viewMode,
  onViewModeChange,
  onUploadClick,
  isSearching = false,
  onNavigateToFolder,
}) {
  const [internalViewMode, setInternalViewMode] = useState(() => {
    return localStorage.getItem('filesViewMode') || 'grid';
  });

  const effectiveViewMode = viewMode ?? internalViewMode;

  const handleViewModeChange = (mode) => {
    setInternalViewMode(mode);
    localStorage.setItem('filesViewMode', mode);
    onViewModeChange?.(mode);
  };

  const isEmpty = files.length === 0 && folders.length === 0;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50">
        <Breadcrumbs currentPath={currentPath} onNavigate={onBreadcrumbClick} />
        <div className="flex items-center gap-2">
          {/* Upload button */}
          {/* {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <MdCloudUpload />
              Upload
            </button>
          )} */}

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                effectiveViewMode === 'grid'
                  ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Grid view"
            >
              <MdGridView />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-1.5 rounded-md transition-colors ${
                effectiveViewMode === 'list'
                  ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="List view"
            >
              <MdViewList />
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 bg-background-light dark:bg-background-dark/50">
        {/* Search indicator */}
        {isSearching && !loading && (
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <MdFolder />
            <span>Showing {files.length} search result{files.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading files...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && isEmpty && (
          <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 mb-4">No files or folders in this location</p>
            {onUploadClick && (
              <button
                onClick={onUploadClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <MdCloudUpload />
                Upload a file
              </button>
            )}
          </div>
        )}

        {/* Folders and files */}
        {!loading && !isEmpty && (
          <div className="space-y-4">
            {/* Folders section */}
            {folders.length > 0 && (
              <div>
                {effectiveViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {folders.map((folder) => (
                      <FolderCard
                        key={folder.path}
                        name={folder.name}
                        path={folder.path}
                        fileCount={folder.fileCount}
                        totalSizeDisplay={folder.totalSizeDisplay}
                        onClick={onFolderClick}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {folders.map((folder) => (
                      <FolderCard
                        key={folder.path}
                        name={folder.name}
                        path={folder.path}
                        fileCount={folder.fileCount}
                        totalSizeDisplay={folder.totalSizeDisplay}
                        onClick={onFolderClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Files section */}
            {files.length > 0 && (
              <div>
                {effectiveViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {files.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        viewMode="grid"
                        onDownload={onFileDownload}
                        onDelete={onFileDelete}
                        onPreview={onFilePreview}
                        isSearching={isSearching}
                        onNavigateToFolder={onNavigateToFolder}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* List header */}
                    <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">
                      <div className="w-10 shrink-0"></div>
                      <div className="flex-1">Name</div>
                      <div className="w-20 text-right shrink-0">Type</div>
                      <div className="w-24 text-right shrink-0">Size</div>
                      <div className="w-32 text-right shrink-0">Modified</div>
                      <div className="w-20 shrink-0"></div>
                    </div>
                    {files.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        viewMode="list"
                        onDownload={onFileDownload}
                        onDelete={onFileDelete}
                        onPreview={onFilePreview}
                        isSearching={isSearching}
                        onNavigateToFolder={onNavigateToFolder}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
