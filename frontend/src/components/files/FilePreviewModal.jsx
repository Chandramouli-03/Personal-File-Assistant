import { useState, useEffect } from 'react';
import {
  MdClose,
  MdDownload,
  MdDescription,
  MdImage,
  MdCode,
  MdInsertDriveFile,
  MdPictureAsPdf,
  MdTableChart,
} from 'react-icons/md';
import { readFile } from '../../services/api';

// File types that can be previewed
const PREVIEWABLE_TYPES = {
  text: ['txt', 'md', 'log'],
  code: ['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'],
  pdf: ['pdf'],
  csv: ['csv'],
  // Doc and XLS show a download message instead of preview
  document: ['doc', 'docx', 'odt'],
  spreadsheet: ['xls', 'xlsx', 'ods'],
};

const getFileCategory = (extension) => {
  const ext = extension?.toLowerCase().replace('.', '') || '';
  if (PREVIEWABLE_TYPES.text.includes(ext)) return 'text';
  if (PREVIEWABLE_TYPES.code.includes(ext)) return 'code';
  if (PREVIEWABLE_TYPES.image.includes(ext)) return 'image';
  if (PREVIEWABLE_TYPES.pdf.includes(ext)) return 'pdf';
  if (PREVIEWABLE_TYPES.csv.includes(ext)) return 'csv';
  if (PREVIEWABLE_TYPES.document.includes(ext)) return 'document';
  if (PREVIEWABLE_TYPES.spreadsheet.includes(ext)) return 'spreadsheet';
  return null;
};

// Simple CSV parser that handles quoted values
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
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
        } else if (category === 'pdf') {
          // For PDF, we use the download URL for iframe
          setContent(`/api/files/download?path=${encodeURIComponent(file.path)}`);
        } else if (category === 'csv') {
          // For CSV files, fetch the content and parse it
          const result = await readFile(file.deviceId, file.path, 100000);
          setContent(result.content);
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
               category === 'pdf' ? <MdPictureAsPdf /> :
               category === 'csv' ? <MdTableChart /> :
               category === 'document' ? <MdDescription /> :
               category === 'spreadsheet' ? <MdTableChart /> :
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

          {/* PDF preview */}
          {category === 'pdf' && content && (
            <div className="h-full min-h-[60vh]">
              <iframe
                src={content}
                className="w-full h-full rounded-lg border-0"
                title={`PDF Preview: ${file.name}`}
              />
            </div>
          )}

          {/* CSV preview as table */}
          {category === 'csv' && content && (
            <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {(() => {
                    const lines = content.split('\n').filter(line => line.trim());
                    if (lines.length === 0) return null;
                    const headers = parseCSVLine(lines[0]);
                    return (
                      <tr>
                        {headers.map((header, idx) => (
                          <th key={idx} className="px-4 py-2 font-medium border-b border-slate-200 dark:border-slate-600">
                            {header}
                          </th>
                        ))}
                      </tr>
                    );
                  })()}
                </thead>
                <tbody>
                  {(() => {
                    const lines = content.split('\n').filter(line => line.trim());
                    if (lines.length <= 1) return null;
                    return lines.slice(1, 51).map((line, rowIdx) => {
                      const cells = parseCSVLine(line);
                      return (
                        <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50">
                          {cells.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-4 py-2 text-slate-700 dark:text-slate-300">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              {(() => {
                const lines = content.split('\n').filter(line => line.trim());
                if (lines.length > 51) {
                  return (
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      Showing first 50 rows of {lines.length - 1} data rows. Download to view all.
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {/* Document preview - download message */}
          {category === 'document' && (
            <div className="text-center py-12">
              <MdDescription className="text-6xl text-blue-400 mx-auto mb-4" />
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                Document Preview
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Word documents (.doc, .docx) cannot be previewed in the browser.
              </p>
              <button
                onClick={() => onDownload(file)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <MdDownload />
                Download to View
              </button>
            </div>
          )}

          {/* Spreadsheet preview - download message */}
          {category === 'spreadsheet' && (
            <div className="text-center py-12">
              <MdTableChart className="text-6xl text-green-400 mx-auto mb-4" />
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                Spreadsheet Preview
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Excel spreadsheets (.xls, .xlsx) cannot be previewed in the browser.
              </p>
              <button
                onClick={() => onDownload(file)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <MdDownload />
                Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
