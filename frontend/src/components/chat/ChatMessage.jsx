import { useState } from 'react';
import { MdSmartToy, MdPerson, MdPictureAsPdf, MdImage, MdVideoFile, MdDescription, MdContentCopy, MdDownload, MdVisibility } from 'react-icons/md';
import FileReferenceCard from './FileReferenceCard';

const ChatMessage = ({ message, onFileAction }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'max-w-[85%] ml-auto flex-row-reverse' : 'max-w-[90%]'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isUser ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
        {isUser ? (
          <MdPerson className="text-sm" />
        ) : (
          <MdSmartToy className="text-sm" />
        )}
      </div>

      {/* Message Content */}
      <div className="space-y-4">
        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' : 'bg-slate-100 dark:bg-slate-800/50 rounded-tl-none border border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-slate-200'}`}>
          {message.content}
        </div>

        {/* Tool Calls Badge */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.tool_calls.map((tool, index) => (
              <div key={index} className="inline-flex items-center gap-0.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full text-[10px] font-medium text-blue-600 dark:text-blue-400">
                <span>🔍</span>
                <span>{tool.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* File References */}
        {message.file_references && message.file_references.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
            {message.file_references.map((file, index) => (
              <FileReferenceCard
                key={index}
                file={file}
                onAction={onFileAction}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-[10px] text-slate-400 text-right mt-1">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
