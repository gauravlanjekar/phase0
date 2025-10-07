import { BedrockAgentCoreClient, CreateEventCommand, ListEventsCommand } from '@aws-sdk/client-bedrock-agentcore';

// Agent Core Memory integration using AWS SDK
export class AgentCoreMemory {
  private memoryId: string;
  private client: BedrockAgentCoreClient;
  private actorId: string;

  constructor(memoryId: string) {
    this.memoryId = memoryId; // Use provided: phase0_memory-FoLSzrEHtq
    this.actorId = 'mission-agent';
    this.client = new BedrockAgentCoreClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  // Store conversation memory using Agent Core memory service
  async storeMemory(sessionId: string, messages: any[]): Promise<void> {
    try {
      for (const message of messages.slice(-5)) {
        const role = message.constructor.name === 'HumanMessage' ? 'USER' : 'ASSISTANT';
        const content = message.content?.toString().substring(0, 500) || 'Empty message';
        
        // Skip empty messages to avoid validation error
        if (content.trim().length === 0) continue;
        
        const preview = content.trim().split(' ').slice(0, 5).join(' ');
        console.log(`Storing ${role}: ${preview}...`);
        
        const command = new CreateEventCommand({
          memoryId: this.memoryId,
          actorId: this.actorId,
          sessionId,
          eventTimestamp: new Date(),
          payload: [{
            conversational: {
              content: { text: content.trim() },
              role
            }
          }],
          branch: { name: 'main' }
        });

        await this.client.send(command);
      }
      
      console.log(`Stored ${messages.slice(-5).length} messages to Agent Core memory ${this.memoryId}: ${sessionId}`);
      
    } catch (error) {
      console.error('Failed to store to Agent Core memory:', error);
    }
  }

  // Retrieve conversation memory from Agent Core
  async getMemory(sessionId: string): Promise<any[]> {
    try {
      const command = new ListEventsCommand({
        memoryId: this.memoryId,
        sessionId,
        actorId: this.actorId,
        includePayloads: true
      });
      
      const response = await this.client.send(command);
      
      if (response.events) {
        return response.events.map(event => ({
          role: event.payload?.[0]?.conversational?.role?.toLowerCase() || 'assistant',
          content: event.payload?.[0]?.conversational?.content?.text || '',
          timestamp: event.eventTimestamp
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to retrieve from Agent Core memory:', error);
      return [];
    }
  }

  // Clear session memory from Agent Core
  async clearMemory(sessionId: string): Promise<void> {
    try {
      // Note: Bedrock Agent Core doesn't have a direct delete command
      // Events are typically managed by retention policies
      console.log(`Memory clearing not directly supported for ${this.memoryId}: ${sessionId}`);
    } catch (error) {
      console.error('Failed to clear Agent Core memory:', error);
    }
  }

  // Create session summary for Agent Core
  private createSessionSummary(messages: any[]): string {
    const userMessages = messages.filter(m => m.constructor.name === 'HumanMessage');
    const lastUserMessage = userMessages[userMessages.length - 1];
    const messageCount = messages.length;
    
    return `Session with ${messageCount} messages. Last topic: ${lastUserMessage?.content?.substring(0, 100) || 'N/A'}`;
  }
}

// Hybrid memory manager - combines provided Agent Core memory with local fallback
export class HybridMemoryManager {
  private agentCoreMemory: AgentCoreMemory;
  private localMemory: Map<string, any[]>;

  constructor(memoryId: string) {
    // Use the provided Agent Core memory: phase0_memory-FoLSzrEHtq
    this.agentCoreMemory = new AgentCoreMemory(memoryId);
    this.localMemory = new Map();
    console.log(`Initialized with Agent Core memory: ${memoryId}`);
  }

  async storeConversation(sessionId: string, messages: any[]): Promise<void> {
    // Store in both provided Agent Core memory and local fallback
    await Promise.all([
      this.agentCoreMemory.storeMemory(sessionId, messages),
      this.storeLocal(sessionId, messages)
    ]);
  }

  async getConversation(sessionId: string): Promise<any[]> {
    try {
      // Try Agent Core memory first
      const agentCoreMessages = await this.agentCoreMemory.getMemory(sessionId);
      if (agentCoreMessages.length > 0) {
        return agentCoreMessages;
      }
    } catch (error) {
      console.warn('Agent Core memory unavailable, using local fallback');
    }
    
    // Fallback to local memory
    return this.localMemory.get(sessionId) || [];
  }

  async clearConversation(sessionId: string): Promise<void> {
    // Clear from both Agent Core memory and local storage
    await Promise.all([
      this.agentCoreMemory.clearMemory(sessionId),
      this.clearLocal(sessionId)
    ]);
  }

  // Get memory info for monitoring
  getMemoryInfo(): { memoryId: string; localSessions: number } {
    return {
      memoryId: this.agentCoreMemory['memoryId'],
      localSessions: this.localMemory.size
    };
  }

  private async storeLocal(sessionId: string, messages: any[]): Promise<void> {
    // Keep last 20 messages locally
    this.localMemory.set(sessionId, messages.slice(-20));
  }

  private async clearLocal(sessionId: string): Promise<void> {
    this.localMemory.delete(sessionId);
  }
}