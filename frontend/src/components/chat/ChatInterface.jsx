import { useState, useRef, useEffect } from 'react';
import { MdSmartToy, MdRefresh } from 'react-icons/md';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useChat } from '../../hooks/useChat';
import { useChatContext } from '../../contexts/ChatContext';

export default function ChatInterface() {
  const {
    messages,
    loading,
    error,
    sendMessage,
    clearConversation,
    currentConversationId,
  } = useChat();

  const { markForReload } = useChatContext();

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [prefilledMessage, setPrefilledMessage] = useState('');

  // Mark conversation for reload when unmounting (navigating away)
  useEffect(() => {
    return () => {
      if (currentConversationId) {
        markForReload();
      }
    };
  }, [currentConversationId, markForReload]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSendMessage = (content) => {
    sendMessage(content);
    setPrefilledMessage(''); // Clear prefilled message after sending
  };

  // Handle suggestion click
  const handleSuggestionClick = (event) => {
    const suggestion = event.currentTarget.textContent;
    handleSendMessage(suggestion);
  };

  // Handle file action
  const handleFileAction = (file, action) => {
    console.log('File action:', action, file);
    switch (action) {
      case 'summarize':
        // Pre-fill chat with summarize request - user can edit before sending
        setPrefilledMessage(`Summarize the file at ${file.path}`);
        break;
      case 'preview':
        // Open file preview modal
        break;
      case 'download':
        // Download file
        window.open(`/api/files/download?path=${encodeURIComponent(file.path)}`, '_blank');
        break;
      case 'copy':
        // Copy file path to clipboard
        navigator.clipboard.writeText(file.path);
        break;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-primary/5 bg-white/50 dark:bg-background-dark/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MdSmartToy className="text-xl" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-background-dark rounded-full"></div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Stream</h2>
            <p className="text-xs text-slate-400 uppercase tracking-tighter">Ready to search your files</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearConversation}
            className="p-2 text-slate-400 hover:text-primary transition-colors"
            title="New conversation"
          >
            <MdRefresh className="text-lg" />
          </button>
        </div>
      </header>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 w-full"
      >
        {/* Welcome State */}
        {messages.length === 0 && !loading && (
          <div className="text-center">
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MdSmartToy className="text-md" />
              </div>
              <div className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700/50">
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    Hello! I'm your cross-device file assistant. What are you looking for today?
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-left">
              <p className="text-sm font-semibold text-slate-600 mb-2">Try asking:</p>
              <ul className="space-y-2">
                <li
                  onClick={handleSuggestionClick}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-500 hover:border-primary/50 hover:text-primary transition-all whitespace-nowrap cursor-pointer"
                >
                  Find my resume PDF
                </li>
                <li
                  onClick={handleSuggestionClick}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-500 hover:border-primary/50 hover:text-primary transition-all whitespace-nowrap cursor-pointer"
                >
                  Show me photos from last week
                </li>
                <li
                  onClick={handleSuggestionClick}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-500 hover:border-primary/50 hover:text-primary transition-all whitespace-nowrap cursor-pointer"
                >
                  What files are on my Desktop?
                </li>
                <li
                  onClick={handleSuggestionClick}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-500 hover:border-primary/50 hover:text-primary transition-all whitespace-nowrap cursor-pointer"
                >
                  Read the document for me
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id || index}
            message={message}
            onFileAction={handleFileAction}
          />
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-4 max-w-[85%]">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <MdSmartToy className="text-sm" />
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-2xl rounded-tl-none">
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse delay-75"></div>
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-500 underline hover:text-red-700"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-gradient-to-t from-white dark:from-background-dark via-white dark:via-background-dark to-transparent">
        <ChatInput
          onSend={handleSendMessage}
          disabled={loading}
          placeholder="Message AI Assistant or search for files..."
          prefilledMessage={prefilledMessage}
        />
      </div>
    </div>
  );
}
