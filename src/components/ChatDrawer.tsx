import React, { useState, useRef, useEffect } from 'react';
import { Stack, TextInput, Button, Paper, Text, Group, ScrollArea, Loader } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { missionAPI } from '../services/api';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: string;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({ missionId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>();
  const viewport = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...(prev || []), userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await missionAPI.sendChatMessage(missionId, inputMessage, threadId);
      
      if (!threadId && response.threadId) {
        setThreadId(response.threadId);
      }

      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...(prev || []), agentMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...(prev || []), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack h="100%" gap="md">
      <ScrollArea h="calc(100vh - 200px)" viewportRef={viewport}>
        <Stack gap="md" p="md">
          {(messages || []).length === 0 && (
            <Paper p="md" radius="md" style={{ textAlign: 'center' }}>
              <Text c="dimmed">Hello! I'm your mission design assistant.</Text>
              <Text size="sm" c="dimmed" mt="xs">
                Ask me anything about your mission objectives, requirements, or constraints.
              </Text>
            </Paper>
          )}
          
          {(messages || []).map((message) => (
            <Group key={message.id} justify={message.isUser ? 'flex-end' : 'flex-start'}>
              <Paper
                p="sm"
                radius="md"
                style={{
                  maxWidth: '80%',
                  backgroundColor: message.isUser ? '#228be6' : '#f8f9fa',
                  color: message.isUser ? 'white' : 'black'
                }}
              >
                <Text size="sm">{message.text}</Text>
                <Text size="xs" opacity={0.7} mt="xs">
                  {message.timestamp.toLocaleTimeString()}
                </Text>
              </Paper>
            </Group>
          ))}
          
          {isLoading && (
            <Group justify="flex-start">
              <Paper p="sm" radius="md" style={{ backgroundColor: '#f8f9fa' }}>
                <Group gap="xs">
                  <Loader size="xs" />
                  <Text size="sm">Thinking...</Text>
                </Group>
              </Paper>
            </Group>
          )}
        </Stack>
      </ScrollArea>

      <form onSubmit={sendMessage}>
        <Group gap="xs">
          <TextInput
            placeholder="Ask about your mission..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            style={{ flex: 1 }}
          />
          <Button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            leftSection={<IconSend size={16} />}
          >
            Send
          </Button>
        </Group>
      </form>
    </Stack>
  );
};

export default ChatDrawer;