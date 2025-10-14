import { tool } from '@langchain/core/tools';
import { z } from 'zod/v4';
import axios from 'axios';

const API_BASE = process.env.API_BASE || 'https://api.phase0.gauravlanjekar.in';

export const generateMissionNameTool = tool(
  async ({ missionId, brief }: { missionId: string; brief: string }) => {
    // Generate a concise, professional mission name based on the brief
    const keywords = brief.toLowerCase().match(/\b(earth|observation|monitoring|imaging|satellite|climate|agriculture|disaster|forest|urban|ocean|weather)\b/g) || [];
    const uniqueKeywords = [...new Set(keywords)];
    
    // Create mission name suggestions
    const suggestions = [
      `${uniqueKeywords[0] || 'earth'}-obs-${Date.now().toString().slice(-4)}`,
      `${uniqueKeywords.slice(0, 2).join('-') || 'eo'}-mission`,
      `${uniqueKeywords[0] || 'earth'}-monitor-${new Date().getFullYear()}`
    ];
    
    const generatedName = suggestions[0].toUpperCase().replace(/-/g, '_');
    
    // Save the generated name to the mission
    try {
      await axios.put(`${API_BASE}/missions/${missionId}`, { name: generatedName });
      return `Generated and saved mission name: ${generatedName}`;
    } catch (error) {
      console.error('Failed to save mission name:', error);
      return `Generated name: ${generatedName} (failed to save to database)`;
    }
  },
  {
    name: 'generate_mission_name',
    description: 'Generate and save a mission name based on the mission brief',
    schema: z.object({ missionId: z.string(), brief: z.string() })
  }
);