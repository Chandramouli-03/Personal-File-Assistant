import { useState } from 'react';
import {
  MdContentCopy,
  MdDownload,
  MdVisibility,
  MdPictureAsPdf,
  MdImage,
  MdVideoFile,
  MdDescription,
  MdFolder,
  MdLaptopMac,
  MdCloudQueue,
  MdSmartphone,
  MdComputer,
  MdAutoAwesome
} from 'react-icons/md';

const FILE_TYPE_CONFIG = {
  pdf: { icon: MdPictureAsPdf, bgColor: 'bg-red-50 dark:bg-red-900/20', color: 'text-red-500' },
  image: { icon: MdImage, bgColor: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-500' },
  video: { icon: MdVideoFile, bgColor: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-500' },
  document: { icon: MdDescription, bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', color: 'text-yellow-600' },
  default: { icon: MdFolder, bgColor: 'bg-slate-100 dark:bg-slate-700/50', color: 'text-slate-500' },
};

const DEVICE_ICONS = {
  laptop_mac: MdLaptopMac,
  cloud_queue: MdCloudQueue,
  smartphone: MdSmartphone,
  desktop: MdComputer,
};

const getFileTypeInfo = (extension) => {
  const ext = extension.toLowerCase();

  const docTypes = ['pdf', 'docx', 'doc', 'ppt', 'xls', 'txt', 'rtf', 'md'];
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
  const videoTypes = ['mp4', 'avi', 'mov', 'mkv', 'webm'];

  if (imageTypes.includes(ext)) {
    return FILE_TYPE_CONFIG.image;
  }

  if (videoTypes.includes(ext)) {
    return FILE_TYPE_CONFIG.video;
  }

  if (ext === 'pdf') {
    return FILE_TYPE_CONFIG.pdf;
  }

  if (docTypes.includes(ext)) {
    return FILE_TYPE_CONFIG.document;
  }

  return FILE_TYPE_CONFIG.default;
};

const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + units[i];
};

const getDeviceIcon = (deviceName) => {
  const deviceKey = deviceName?.toLowerCase().replace(/\s+/g, '_');
  return DEVICE_ICONS[deviceKey] || MdLaptopMac;
};

const FileReferenceCard = ({ file, onAction, onPreview }) => {
  const fileExtension = getFileExtension(file.name);
  const fileType = getFileTypeInfo(fileExtension);
  const IconComponent = fileType.icon;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl hover:border-primary/50 transition-all cursor-pointer group shadow-sm">
      <div className="flex items-center gap-3">
        {/* File Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${fileType.bgColor} ${fileType.color}`}>
          <IconComponent className="text-xl" />
        </div>

        {/* File Info */}
        <div className="flex-1 overflow-hidden">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
            {file.name}
          </h4>

          <div className="flex items-center gap-2 mt-1">
            {file.device_name && (
              <span className="text-[12px] text-slate-400">
                {getDeviceIcon(file.device_name) && (
                  <span className="inline-flex items-center">
                    {(() => {
                      const DeviceIcon = getDeviceIcon(file.device_name);
                      return <DeviceIcon className="text-[12px]" />;
                    })()}
                  </span>
                )}
                <span className="ml-1">{file.device_name}</span>
              </span>
            )}
            <span className="text-[10px] text-slate-400">
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>

        {/* File Actions */}
        <div className="flex gap-1">
          {/* Summarize Button */}
          <button
            onClick={() => onAction(file, 'summarize')}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            title="Summarize with AI"
          >
            <MdAutoAwesome className="text-base" />
          </button>
          {/* <button
            onClick={() => onAction(file, 'preview')}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Preview"
          >
            <MdVisibility className="text-base" />
          </button> */}
          <button
            onClick={() => onAction(file, 'download')}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Download"
          >
            <MdDownload className="text-base" />
          </button>
          {/* <button
            onClick={() => onAction(file, 'copy')}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Copy Path"
          >
            <MdContentCopy className="text-base" />
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default FileReferenceCard;
