import React, { useState, useRef, useEffect } from 'react';
import { Stack, TextInput, Button, Paper, Text, Group, ScrollArea, Loader, Box } from '@mantine/core';
import { IconSend, IconRocket } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { missionAPI } from '../services/api';
import { useChat } from './ChatContext';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: string;
  initialMessage?: string;
  onMessageSent?: () => void;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({ missionId, initialMessage, onMessageSent }) => {
  const { getMessages, addMessage, loadHistory } = useChat();
  const messages = getMessages(missionId);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [threadId, setThreadId] = useState<string>(() => {
    // Generate random 33-character threadId
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length: 33}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  });
  const viewport = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load conversation history for this mission
    loadHistory(missionId);
  }, [missionId, loadHistory]);

  useEffect(() => {
    if (initialMessage && initialMessage.trim()) {
      setInputMessage(initialMessage);
      // Auto-send the message
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 100);
    }
  }, [initialMessage]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    addMessage(missionId, userMessage);
    setInputMessage('');
    setIsLoading(true);
    onMessageSent?.();

    try {
      const response = await missionAPI.sendChatMessage(
        missionId, 
        inputMessage, 
        threadId,
        (progress) => setProgressMessage(progress)
      );
      
      // Always update threadId from response to maintain conversation
      if (response.sessionId) {
        setThreadId(response.sessionId);
      }

      // If conversation history is provided, sync with it
      if (response.conversationHistory) {
        // Clear existing messages and load from history
        response.conversationHistory.forEach((historyMsg, index) => {
          const message = {
            id: `history_${index}`,
            text: historyMsg.text,
            isUser: historyMsg.isUser,
            timestamp: new Date(historyMsg.timestamp)
          };
          addMessage(missionId, message);
        });
      } else {
        // Fallback: add just the agent response
        const agentMessage = {
          id: (Date.now() + 1).toString(),
          text: response.response,
          isUser: false,
          timestamp: new Date()
        };
        addMessage(missionId, agentMessage);
      }
      
      // Trigger data refresh after agent response
      window.dispatchEvent(new CustomEvent('agentResponseReceived', { 
        detail: { missionId } 
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      addMessage(missionId, errorMessage);
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  };

  return (
    <Stack h="100%" gap="md" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)' }}>
      <ScrollArea h="calc(100vh - 200px)" viewportRef={viewport}>
        <Stack gap="md" p="md">
          {(messages || []).length === 0 && (
            <Paper 
              p="xl" 
              radius="lg" 
              style={{ 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Group justify="center" mb="md">
                <IconRocket size={32} style={{ color: '#4c6ef5' }} />
              </Group>
              <Text size="lg" fw={600} c="dark.7" mb="xs">Mission Design Assistant</Text>
              <Text size="sm" c="dimmed">
                I'm here to help with your space mission analysis and design. Ask me about:
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                • Mission objectives and requirements
                • Spacecraft design solutions
                • Orbital mechanics and constraints
                • Component specifications
              </Text>
            </Paper>
          )}
          
          {(messages || []).map((message) => (
            <Group key={message.id} justify={message.isUser ? 'flex-end' : 'flex-start'} align="flex-start">
              <Paper
                p="md"
                radius="lg"
                style={{
                  maxWidth: '85%',
                  background: message.isUser 
                    ? 'linear-gradient(135deg, #4c6ef5 0%, #364fc7 100%)'
                    : 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: message.isUser 
                    ? '1px solid rgba(76, 110, 245, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: message.isUser
                    ? '0 8px 32px rgba(76, 110, 245, 0.3)'
                    : '0 8px 32px rgba(0, 0, 0, 0.1)',
                  color: message.isUser ? 'white' : 'inherit'
                }}
              >
                <Box style={{ 
                  '& h1, & h2, & h3': { marginTop: '0.5rem', marginBottom: '0.5rem' },
                  '& p': { marginBottom: '0.5rem' },
                  '& ul, & ol': { marginLeft: '1rem', marginBottom: '0.5rem' },
                  '& code': { 
                    background: message.isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    fontSize: '0.85em'
                  },
                  '& pre': {
                    background: message.isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    overflow: 'auto',
                    marginBottom: '0.5rem'
                  },
                  '& blockquote': {
                    borderLeft: `3px solid ${message.isUser ? 'rgba(255,255,255,0.5)' : '#4c6ef5'}`,
                    paddingLeft: '1rem',
                    marginLeft: '0',
                    fontStyle: 'italic',
                    opacity: 0.9
                  },
                  '& table': {
                    borderCollapse: 'collapse',
                    width: '100%',
                    marginBottom: '0.5rem'
                  },
                  '& th, & td': {
                    border: `1px solid ${message.isUser ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}`,
                    padding: '0.5rem',
                    textAlign: 'left'
                  },
                  '& th': {
                    background: message.isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    fontWeight: 600
                  }
                }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.text}
                  </ReactMarkdown>
                </Box>
                <Text size="xs" opacity={0.7} mt="xs" style={{ textAlign: 'right' }}>
                  {message.timestamp.toLocaleTimeString()}
                </Text>
              </Paper>
            </Group>
          ))}
          
          {isLoading && (
            <Group justify="flex-start">
              <Paper 
                p="md" 
                radius="lg" 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Group gap="xs">
                  <Loader size="sm" color="blue" />
                  <Text size="sm" c="dimmed">
                    {progressMessage || 'Analyzing your request...'}
                  </Text>
                </Group>
              </Paper>
            </Group>
          )}
        </Stack>
      </ScrollArea>

      <Box p="md" style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <form onSubmit={sendMessage}>
          <Group gap="xs">
            <TextInput
              placeholder="Ask about your mission design..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              style={{ flex: 1 }}
              styles={{
                input: {
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 16px'
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              leftSection={<IconSend size={16} />}
              radius="xl"
              style={{
                background: 'linear-gradient(135deg, #4c6ef5 0%, #364fc7 100%)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(76, 110, 245, 0.3)'
              }}
            >
              Send
            </Button>
          </Group>
        </form>
      </Box>
    </Stack>
  );
};

export default ChatDrawer;