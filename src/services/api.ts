import { Mission, Objective, Requirement, Constraint, DesignSolution } from '../types/models';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://paf4sflt0a.execute-api.eu-central-1.amazonaws.com/dev';
const LANGGRAPH_BASE = process.env.REACT_APP_LANGGRAPH_BASE || 'http://localhost:3002';



interface ChatResponse {
  response: string;
  threadId: string;
}

interface GenerationResponse<T> {
  success: boolean;
  error?: string;
  [key: string]: T[] | boolean | string | undefined;
}

export const missionAPI = {
  // Get all missions
  getMissions: async (): Promise<Mission[]> => {
    const response = await fetch(`${API_BASE}/missions`);
    return response.json();
  },

  // Create new mission
  createMission: async (brief: string): Promise<Mission> => {
    const response = await fetch(`${API_BASE}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief })
    });
    return response.json();
  },

  // Update mission name
  updateMissionName: async (id: string, name: string): Promise<Mission> => {
    const response = await fetch(`${API_BASE}/missions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return response.json();
  },

  // Delete mission
  deleteMission: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/missions/${id}`, {
      method: 'DELETE'
    });
  },

  // Get tab data
  getTabData: async (missionId: string, tabIndex: number): Promise<any> => {
    const response = await fetch(`${API_BASE}/missions/${missionId}/tabs/${tabIndex}`);
    return response.json();
  },

  // Save tab data
  saveTabData: async (missionId: string, tabIndex: number, data: any): Promise<any> => {
    const response = await fetch(`${API_BASE}/missions/${missionId}/tabs/${tabIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Send chat message with streaming support
  sendChatMessage: async (missionId: string, message: string, threadId?: string, onProgress?: (message: string) => void): Promise<ChatResponse> => {
    try {
      const useStreaming = !!onProgress;
      const response = await fetch(`${LANGGRAPH_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, missionId, threadId, stream: useStreaming })
      });
      
      if (useStreaming && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let finalResponse = '';
        let finalThreadId = threadId || `mission_${missionId}`;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'progress') {
                  onProgress(data.message);
                } else if (data.type === 'complete') {
                  finalResponse = data.response;
                  finalThreadId = data.threadId;
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
        
        return { response: finalResponse, threadId: finalThreadId };
      } else {
        return response.json();
      }
    } catch (error) {
      console.error('LangGraph agent not available, using fallback');
      const response = await fetch(`${API_BASE}/missions/${missionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      return response.json();
    }
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
      const prompt = `Generate 10-12 focused technical requirements for this Earth Observation mission.
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
      const prompt = `Generate 6-8 mission constraints covering budget, schedule, technical, and regulatory limitations.
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
      const prompt = `Generate 1 complete spacecraft design solution with ALL 8 standard components (payload, power, avionics, adcs, communications, structure, thermal, propulsion), sun-synchronous orbit, and ground stations.
Use get_solutions_schema and save_solutions tools.`;
      
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

This creates a complete early-phase mission analysis baseline.`;
      
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
      const response = await fetch(`${API_BASE}/missions/${missionId}/tabs/4`);
      const data = await response.json();
      return data[`validation_${solutionId}`] || [];
    } catch (error) {
      console.error('Failed to get validation reports:', error);
      return [];
    }
  },

  // Get conversation history
  getConversationHistory: async (missionId: string, threadId: string): Promise<{ messages: any[] }> => {
    try {
      const response = await fetch(`${LANGGRAPH_BASE}/history/${threadId}`);
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