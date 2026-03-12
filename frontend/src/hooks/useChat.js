import { useState, useCallback, useRef, useEffect } from "react";
import { getConversation, deleteConversation } from "../services/api";
import { useChatContext } from "../contexts/ChatContext";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);

  const abortControllerRef = useRef(null);

  const {
    currentConversationId: contextConversationId,
    setCurrentConversationId: setContextConversationId,
    needsReload,
    clearReloadFlag,
  } = useChatContext();

  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    // Cancel ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    const assistantMessageId = `assistant-${Date.now()}`;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    const assistantMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      file_references: [],
      tool_calls: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          conversation_id: currentConversationId,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const chunk = JSON.parse(line.slice(6));

            if (chunk.type === "error") {
              throw new Error(chunk.content);
            }

            if (chunk.type === "content") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + chunk.content }
                    : msg
                )
              );
            }

            if (chunk.type === "tool_call") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        tool_calls: [...(msg.tool_calls || []), chunk.tool_call],
                      }
                    : msg
                )
              );
            }

            if (chunk.type === "file_result") {
              // Track recent files for context (keep last 10)
              setRecentFiles((prev) => {
                const newFiles = [chunk.file_result, ...prev.filter(
                  (f) => f.path !== chunk.file_result.path
                )];
                return newFiles.slice(0, 10);
              });

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        file_references: [
                          ...(msg.file_references || []),
                          chunk.file_result,
                        ],
                      }
                    : msg
                )
              );
            }

            if (chunk.type === "done") {
              setCurrentConversationId(chunk.conversation_id);
              setContextConversationId(chunk.conversation_id);
            }
          } catch (e) {
            console.error("Failed to parse SSE chunk:", e);
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Chat error:", err);
        setError(err.message);

        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        );
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [currentConversationId, setContextConversationId]);

  const clearConversation = useCallback(async () => {
    if (currentConversationId) {
      try {
        await deleteConversation(currentConversationId);
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    }

    setMessages([]);
    setCurrentConversationId(null);
    setContextConversationId(null);
    setError(null);
    setRecentFiles([]);
  }, [currentConversationId, setContextConversationId]);

  const loadConversation = useCallback(async (conversationId) => {
    try {
      const data = await getConversation(conversationId);

      const formattedMessages = data.messages.map((msg) => ({
        ...msg,
        created_at: msg.created_at,
      }));

      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
      setContextConversationId(conversationId);
    } catch (err) {
      console.error("Failed to load conversation:", err);
      setError(err.message);
    }
  }, [setContextConversationId]);

  // Reload conversation from backend when returning to chat
  useEffect(() => {
    if (needsReload && contextConversationId) {
      loadConversation(contextConversationId);
      clearReloadFlag();
    }
  }, [needsReload, contextConversationId, loadConversation, clearReloadFlag]);

  return {
    messages,
    loading,
    error,
    currentConversationId,
    recentFiles,
    sendMessage,
    clearConversation,
    loadConversation,
  };
}