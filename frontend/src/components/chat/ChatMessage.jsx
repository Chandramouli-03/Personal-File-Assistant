import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MdSmartToy, MdPerson, MdPictureAsPdf, MdImage, MdVideoFile, MdDescription, MdContentCopy, MdDownload, MdVisibility } from 'react-icons/md';
import FileReferenceCard from './FileReferenceCard';

const ChatMessage = ({ message, onFileAction }) => {
  const isUser = message.role === 'user';

  // Custom components for markdown rendering
  const components = {
    // Style links/URLs nicely
    a: ({ node, children, href, ...props }) => {
      const isFileUrl = href?.startsWith('/');
      return (
        <a
          href={href}
          {...props}
          className={`
            inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono
            ${isFileUrl
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/30'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:underline'
            }
            transition-all duration-200 break-all max-w-full
          `}
          title={href}
        >
          {isFileUrl && <span className="text-[10px]">📁</span>}
          {children}
        </a>
      );
    },
    // Style headings
    h1: ({ children }) => (
      <h1 className="text-lg font-bold mt-4 mb-2 text-slate-900 dark:text-white">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-semibold mt-3 mb-2 text-slate-800 dark:text-slate-100">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-200">{children}</h3>
    ),
    // Style paragraphs
    p: ({ children }) => (
      <p className="my-1.5">{children}</p>
    ),
    // Style bold text
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
    ),
    // Style lists
    ul: ({ children }) => (
      <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-slate-700 dark:text-slate-300">{children}</li>
    ),
    // Style code blocks
    code: ({ node, inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code
            className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono text-slate-700 dark:text-slate-300"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className="block p-3 bg-slate-800 dark:bg-slate-900 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

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
        {(message.content || message.tool_calls?.length > 0) && (
          <div className={`p-4 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' : 'bg-slate-100 dark:bg-slate-800/50 rounded-tl-none border border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-slate-200'}`}>
            {isUser ? (
              message.content
            ) : (
              <ReactMarkdown components={components}>{message.content}</ReactMarkdown>
            )}
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2 no-scrollbar">
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
