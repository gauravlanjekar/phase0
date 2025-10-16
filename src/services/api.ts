import { Mission, Objective, Requirement, Constraint, DesignSolution } from '../types/models';
import { authService } from './auth';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://api.phase0.gauravlanjekar.in';
const LANGGRAPH_BASE = process.env.REACT_APP_LANGGRAPH_BASE || 'http://localhost:8080';

// Helper function to get authenticated headers
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const token = await authService.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};



interface ChatResponse {
  response: string;
  sessionId: string;
  conversationHistory?: Array<{
    text: string;
    isUser: boolean;
    timestamp: string;
  }>;
}

interface GenerationResponse<T> {
  success: boolean;
  error?: string;
  [key: string]: T[] | boolean | string | undefined;
}

export const missionAPI = {
  // Get all missions
  getMissions: async (): Promise<Mission[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/missions`, { headers });
    return response.json();
  },

  // Create new mission
  createMission: async (brief: string): Promise<Mission> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/missions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ brief })
    });
    return response.json();
  },

  // Update mission name
  updateMissionName: async (id: string, name: string): Promise<Mission> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/missions/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ name })
    });
    return response.json();
  },

  // Delete mission
  deleteMission: async (id: string): Promise<void> => {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/missions/${id}`, {
      method: 'DELETE',
      headers
    });
  },

  // Get tab data
  getTabData: async (missionId: string, tabIndex: number): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/missions/${missionId}/tabs/${tabIndex}`, { headers });
    return response.json();
  },

  // Save tab data
  saveTabData: async (missionId: string, tabIndex: number, data: any): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/missions/${missionId}/tabs/${tabIndex}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Send chat message with streaming support
  // Note: Due to ALB (Application Load Balancer) limitations, chunk streaming may not work properly in production
  // The UI implements progress simulation as a workaround to provide user feedback
  sendChatMessage: async (missionId: string, message: string, threadId?: string, onProgress?: (message: string) => void): Promise<ChatResponse> => {
    // Check if running locally (development)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
      // Local development - call agent directly
      try {
        const sessionId = threadId || `mission_${missionId}`;
        const headers = await getAuthHeaders();
        const response = await fetch(`${LANGGRAPH_BASE}/invocations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            sessionId,
            input: { prompt: `Working with Mission ID: ${missionId}. Use this ID when calling tools that require missionId parameter.\n\n${message}` }
          })
        });
        
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let finalResponse = '';
          let finalSessionId = sessionId;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.progress) {
                    // Show progress message
                    onProgress?.(data.progress);
                  } else if (data.completion) {
                    finalResponse = data.completion;
                    finalSessionId = data.sessionId;
                    onProgress?.(data.completion);
                    if (data.conversationHistory) {
                      return { 
                        response: finalResponse, 
                        sessionId: finalSessionId,
                        conversationHistory: data.conversationHistory
                      };
                    }
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
          
          return { response: finalResponse, sessionId: finalSessionId };
        }
      } catch (error) {
        console.error('Local agent not available, falling back to API');
      }
    }
    
    // Production - use streaming endpoint
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/missions/${missionId}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, threadId })
    });
    
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData = { response: '', sessionId: threadId || `mission_${missionId}`, conversationHistory: [] };
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.completion) {
                  onProgress?.(data.completion);
                  finalData.response = data.completion;
                }
                if (data.sessionId) {
                  finalData.sessionId = data.sessionId;
                }
                if (data.conversationHistory) {
                  finalData.conversationHistory = data.conversationHistory;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      return finalData;
    }
    
    // Fallback to non-streaming
    const fallbackResponse = await fetch(`${API_BASE}/missions/${missionId}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, threadId })
    });
    return fallbackResponse.json();
  },

  // Generate objectives
  generateObjectives: async (missionId: string, brief: string): Promise<GenerationResponse<Objective>> => {
    try {
      const prompt = `Generate 4 realistic mission objectives for this Earth Observation mission: "${brief}"
Make objectives specific, measurable, and achievable for early mission analysis.
Use get_objectives_schema and save_objectives tools.`;
      
      const response = await missionAPI.sendChatMessage(missionId, prompt);
      return { success: true, message: response.response };
    } catch (error) {
      console.error('Failed to auto-generate objectives:', error);
      return { success: false, error: (error as Error).message };
    }
  },
  
  // Generate requirements
  generateRequirements: async (missionId: string, objectives: Objective[]): Promise<GenerationResponse<Requirement>> => {
    try {
      const prompt = `Generate 5-7 focused technical requirements for this Earth Observation mission.
For each requirement, include aiHelperText with plain text guidance on how to validate it against design solutions.
Do NOT use mathematical formulas - use descriptive text like "Check if ground sample distance is better than 5m by examining payload component specifications".
Use get_requirements_schema and save_requirements tools.`;
      
      const response = await missionAPI.sendChatMessage(missionId, prompt);
      return { success: true, message: response.response };
    } catch (error) {
      console.error('Failed to generate requirements:', error);
      return { success: false, error: (error as Error).message };
    }
  },
  
  // Generate constraints
  generateConstraints: async (missionId: string, objectives: Objective[] = [], requirements: Requirement[] = []): Promise<GenerationResponse<Constraint>> => {
    try {
      const prompt = `Generate 3-4 mission constraints covering budget, schedule, technical, and regulatory limitations.
Focus on early mission analysis constraints that drive design decisions.
Use get_constraints_schema and save_constraints tools.`;
      
      const response = await missionAPI.sendChatMessage(missionId, prompt);
      return { success: true, message: response.response };
    } catch (error) {
      console.error('Failed to generate constraints:', error);
      return { success: false, error: (error as Error).message };
    }
  },
  
  // Generate design solutions
  generateDesignSolutions: async (missionId: string, objectives: Objective[] = [], requirements: Requirement[] = [], constraints: Constraint[] = []): Promise<GenerationResponse<DesignSolution>> => {
    try {
      const prompt = `Generate 1 complete spacecraft design solution with ALL 8 standard components (payload, power, avionics, adcs, communications, structure, thermal, propulsion), sun-synchronous orbit, and ground stations. and tries to meet most of the provided requirements
Use get_solutions_schema and save_solutions tools.

After generating the solution, validate it against the mission requirements using save_validation_reports tool.`;
      
      const response = await missionAPI.sendChatMessage(missionId, prompt);
      return { success: true, message: response.response };
    } catch (error) {
      console.error('Failed to generate design solutions:', error);
      return { success: false, error: (error as Error).message };
    }
  },
  
  // Generate baseline solution
  generateBaselineSolution: async (missionId: string, brief: string): Promise<GenerationResponse<DesignSolution>> => {
    try {
      const prompt = `Generate a complete baseline mission design for: "${brief}"

First, generate a mission name using generate_mission_name tool.

Then generate ALL mission elements in sequence:
1. OBJECTIVES: Use get_objectives_schema and save_objectives tools
2. REQUIREMENTS: Use get_requirements_schema and save_requirements tools
3. CONSTRAINTS: Use get_constraints_schema and save_constraints tools
4. DESIGN SOLUTIONS: Use get_solutions_schema and save_solutions tools
5. VALIDATION: After generating solutions, validate each solution against requirements using save_validation_reports tool

This creates a complete early-phase mission analysis baseline with validation results.`;
      
      const response = await missionAPI.sendChatMessage(missionId, prompt);
      return { success: true, message: response.response };
    } catch (error) {
      console.error('Failed to generate baseline solution:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Validate solution
  validateSolution: async (missionId: string, solutionId: string, requirements: Requirement[]): Promise<{ success: boolean; reports?: any[]; error?: string }> => {
    try {
      const reqText = requirements.map(r => `${r.title}: ${r.description}${r.aiHelperText ? ` (Helper: ${r.aiHelperText})` : ''}`).join('\n');
      const prompt = `Validate design solution ${solutionId} against these requirements:\n\n${reqText}\n\nSteps:\n1. Use get_mission_data to access the solution details\n2. For each requirement, validate using the helper text guidance\n3. Use save_validation_reports to persist the results\n\nProvide validation status (PASS/FAIL/ERROR), explanation, actual value, and required value for each requirement.`;
      
      const response = await missionAPI.sendChatMessage(missionId, prompt);
      return { success: true, reports: [] };
    } catch (error) {
      console.error('Failed to validate solution:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Get validation reports
  getValidationReports: async (missionId: string, solutionId: string): Promise<any[]> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/missions/${missionId}/tabs/4`, { headers });
      const data = await response.json();
      return data[`validation_${solutionId}`] || [];
    } catch (error) {
      console.error('Failed to get validation reports:', error);
      return [];
    }
  },

  // Send Agent Core format message
  sendAgentCoreMessage: async (sessionId: string, inputText: string, sessionState?: any): Promise<{ completion: string; sessionId: string }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${LANGGRAPH_BASE}/invocations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId, input: { prompt: inputText }, sessionState })
    });
    
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalCompletion = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.completion) {
                finalCompletion = data.completion;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
      
      
      return { completion: finalCompletion, sessionId };
    }
    
    throw new Error('No response body');
  },

  // Get conversation history
  getConversationHistory: async (missionId: string, sessionId: string): Promise<{ messages: any[] }> => {
    try {
      const response = await fetch(`${LANGGRAPH_BASE}/history/${sessionId}`);
      if (response.ok) {
        return response.json();
      }
      return { messages: [] };
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return { messages: [] };
    }
  }
};