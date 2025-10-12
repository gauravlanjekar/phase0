import React, { createContext, useContext, useState, useCallback } from 'react';
import { missionAPI } from '../services/api';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatContextType {
  messages: Record<string, ChatMessage[]>;
  getMessages: (missionId: string) => ChatMessage[];
  addMessage: (missionId: string, message: ChatMessage) => void;
  setMessages: (missionId: string, messages: ChatMessage[]) => void;
  loadHistory: (missionId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessagesState] = useState<Record<string, ChatMessage[]>>({});

  const getMessages = useCallback((missionId: string): ChatMessage[] => {
    return messages[missionId] || [];
  }, [messages]);

  const addMessage = useCallback((missionId: string, message: ChatMessage) => {
    setMessagesState(prev => ({
      ...prev,
      [missionId]: [...(prev[missionId] || []), message]
    }));
  }, []);

  const setMessages = useCallback((missionId: string, newMessages: ChatMessage[]) => {
    setMessagesState(prev => ({
      ...prev,
      [missionId]: newMessages
    }));
  }, []);

  const loadHistory = useCallback(async (missionId: string) => {
    if (messages[missionId]) return; // Already loaded
    
    try {
      const threadId = `mission_${missionId}`;
      const response = await missionAPI.getConversationHistory(missionId, threadId);
      
      if (response.messages && response.messages.length > 0) {
        const chatMessages: ChatMessage[] = response.messages.map((msg: any, index: number) => ({
          id: `${Date.now()}_${index}`,
          text: msg.content,
          isUser: msg.type === 'human',
          timestamp: new Date(msg.timestamp || Date.now())
        }));
        setMessages(missionId, chatMessages);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }, [messages, setMessages]);

  return (
    <ChatContext.Provider value={{
      messages,
      getMessages,
      addMessage,
      setMessages,
      loadHistory
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};