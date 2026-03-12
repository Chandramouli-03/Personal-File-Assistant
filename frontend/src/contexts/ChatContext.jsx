import { createContext, useContext, useState } from 'react';

const ChatContext = createContext(null);

export function ChatContextProvider({ children }) {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [needsReload, setNeedsReload] = useState(false);

  const markForReload = () => setNeedsReload(true);
  const clearReloadFlag = () => setNeedsReload(false);

  return (
    <ChatContext.Provider value={{
      currentConversationId,
      setCurrentConversationId,
      needsReload,
      markForReload,
      clearReloadFlag,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatContextProvider');
  }
  return context;
}
