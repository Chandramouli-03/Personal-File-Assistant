import { useState, useRef, useEffect } from 'react';
import { MdSend, MdAttachFile } from 'react-icons/md';

const ChatInput = ({ onSend, disabled, placeholder = "Message AI Assistant or search for files...", prefilledMessage }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const inputRef = useRef(null);

  // Handle prefilled message from parent component (e.g., summarize action)
  useEffect(() => {
    if (prefilledMessage) {
      setMessage(prefilledMessage);
      // Focus the textarea after setting the message
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Move cursor to end
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 0);
    }
  }, [prefilledMessage]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Handle keyboard shortcut
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    if (!disabled) {
      setMessage(suggestion);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Suggestion chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['Find images with beaches', 'Summarize my latest resume', 'Files on my Laptop'].map((text) => (
          <button
            key={text}
            onClick={() => handleSuggestionClick(text)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-500 hover:border-primary/50 hover:text-primary transition-all whitespace-nowrap"
          >
            "{text}"
          </button>
        ))}
      </div>

      {/* Input form */}
      <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-slate-100 dark:border-slate-700 focus-within:border-primary/50 transition-all p-2">
        {/* <div className="flex items-center gap-2 pl-3">
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-primary transition-colors"
            title="Attach file"
          >
            <MdAttachFile className="text-xl" />
          </button>
        </div> */}

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="block w-full bg-transparent border-none focus:ring-0 text-sm md:text-base py-3 px-3 text-slate-800 dark:text-white placeholder:text-slate-400 resize-none max-h-[120px] outline-none mb-0"
          />
        </div>

        <div className="flex items-center gap-2 pr-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !message.trim()}
            className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${
              disabled || !message.trim()
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer'
            }`}
          >
            <MdSend className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
