import { tool } from '@langchain/core/tools';
import { z } from 'zod/v4';

export const generateMissionNameTool = tool(
  async ({ brief }: { brief: string }) => {
    // Generate a concise, professional mission name based on the brief
    const keywords = brief.toLowerCase().match(/\b(earth|observation|monitoring|imaging|satellite|climate|agriculture|disaster|forest|urban|ocean|weather)\b/g) || [];
    const uniqueKeywords = [...new Set(keywords)];
    
    // Create mission name suggestions
    const suggestions = [
      `${uniqueKeywords[0] || 'earth'}-obs-${Date.now().toString().slice(-4)}`,
      `${uniqueKeywords.slice(0, 2).join('-') || 'eo'}-mission`,
      `${uniqueKeywords[0] || 'earth'}-monitor-${new Date().getFullYear()}`
    ];
    
    // Return the first suggestion as the generated name
    return suggestions[0].toUpperCase().replace(/-/g, '_');
  },
  {
    name: 'generate_mission_name',
    description: 'Generate a mission name based on the mission brief',
    schema: z.object({ brief: z.string() })
  }
);