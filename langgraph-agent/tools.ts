import { tool } from '@langchain/core/tools';
import { z } from 'zod/v4';
import axios from 'axios';

/*
 * TOOL USAGE INSTRUCTIONS
 * 
 * EFFICIENT TOOL USAGE PATTERNS:
 * 
 * 1. ALWAYS start with get_mission_data to understand current state
 * 2. Use schema tools (get_*_schema) before generating new content
 * 3. For single edits: update_objective/requirement/constraint
 * 4. For bulk operations: save_* or save_multiple_*
 * 5. Validate solutions after creation with save_validation_reports
 * 
 * COMMON WORKFLOWS:
 * 
 * Generate Mission Elements:
 * get_mission_data → get_objectives_schema → save_objectives → 
 * get_requirements_schema → save_requirements → get_constraints_schema → 
 * save_constraints → get_solutions_schema → save_solutions → save_validation_reports
 * 
 * Modify Single Entity:
 * get_mission_data → update_objective/requirement/constraint
 * 
 * Add Components:
 * get_mission_data → add_component → flight_dynamics (recalculate)
 * 
 * Update Orbit:
 * get_mission_data → update_orbit → flight_dynamics (recalculate)
 * 
 * Research Components:
 * search_internet → add_component/update_component
 * 
 * IMPORTANT NOTES:
 * - Always preserve existing data when making updates
 * - Use flight_dynamics after orbit/component changes
 * - Include missionId in all data modification calls
 * - Validation reports are solution-specific (use solutionId)
 * - Internet search for current component specifications
 */


// Import schemas from generator
let ObjectiveSchema: any;
let RequirementSchema: any;
let ConstraintSchema: any;
let ComponentSchema: any;
let DesignSolutionSchema: any;
let ValidationReportSchema: any;

try {
  const schemas = require('./schema-generator');
  ObjectiveSchema = schemas.ObjectiveSchema;
  RequirementSchema = schemas.RequirementSchema;
  ConstraintSchema = schemas.ConstraintSchema;
  ComponentSchema = schemas.ComponentSchema;
  DesignSolutionSchema = schemas.DesignSolutionSchema;
  ValidationReportSchema = schemas.ValidationReportSchema;
} catch (error) {
  // Fallback schemas if generator fails
  ObjectiveSchema = z.any();
  RequirementSchema = z.any();
  ConstraintSchema = z.any();
  ComponentSchema = z.any();
  DesignSolutionSchema = z.any();
  ValidationReportSchema = z.any();
}

// Types
interface LogData {
  [key: string]: any;
}

interface MissionData {
  mission: { id: string; brief: string };
  objectives: any[];
  requirements: any[];
  constraints: any[];
  designSolutions: any[];
}

// Logging utility
const log = {
  info: (msg: string, data?: LogData) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data || ''),
  error: (msg: string, error?: LogData) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error || ''),
  debug: (msg: string, data?: LogData) => console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data || ''),
  warn: (msg: string, data?: LogData) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data || '')
};

// API configuration
const API_BASE = process.env.API_BASE ;
const API_KEY = process.env.API_KEY;

// API headers configuration
const getApiHeaders = () => {
  const headers: any = {
    'Content-Type': 'application/json'
  };
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  return headers;
};

// Core functions
const coreFunctions = {
  async getMissionData(missionId: string): Promise<MissionData> {
    log.debug('📡 Fetching mission data', { missionId, apiBase: API_BASE });
    
    try {
      const missionResponse = await axios.get(`${API_BASE}/missions/${missionId}`, { headers: getApiHeaders() });
      log.debug('✅ Mission basic data retrieved', { status: missionResponse.status });
      
      const [objectivesRes, requirementsRes, constraintsRes, solutionsRes] = await Promise.all([
        axios.get(`${API_BASE}/missions/${missionId}/tabs/0`, { headers: getApiHeaders() }).catch(e => ({ data: null, error: e.message })),
        axios.get(`${API_BASE}/missions/${missionId}/tabs/1`, { headers: getApiHeaders() }).catch(e => ({ data: null, error: e.message })),
        axios.get(`${API_BASE}/missions/${missionId}/tabs/2`, { headers: getApiHeaders() }).catch(e => ({ data: null, error: e.message })),
        axios.get(`${API_BASE}/missions/${missionId}/tabs/3`, { headers: getApiHeaders() }).catch(e => ({ data: null, error: e.message }))
      ]);
      
      return {
        mission: missionResponse.data,
        objectives: objectivesRes.data?.objectives || [],
        requirements: requirementsRes.data?.requirements || [],
        constraints: constraintsRes.data?.constraints || [],
        designSolutions: solutionsRes.data?.designSolutions || []
      };
    } catch (error) {
      log.error('❌ Failed to fetch mission data', { 
        missionId, 
        error: (error as any).message,
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText
      });
      throw error;
    }
  },

  async getData(missionId: string, tabIndex: number): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE}/missions/${missionId}/tabs/${tabIndex}`, { headers: getApiHeaders() });
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async saveData(missionId: string, tabIndex: number, data: any): Promise<void> {
    await axios.put(`${API_BASE}/missions/${missionId}/tabs/${tabIndex}`, data, { headers: getApiHeaders() });
  }
};

// Mission Data Tools
export const getMissionDataTool = tool(
  async ({ missionId }: { missionId: string }) => {
    const data = await coreFunctions.getMissionData(missionId);
    return JSON.stringify(data, null, 2);
  },
  {
    name: 'get_mission_data',
    description: 'ALWAYS use this FIRST to understand current mission state. Returns all objectives, requirements, constraints, and design solutions. Use before any modifications to avoid data loss.',
    schema: z.object({ missionId: z.string() })
  }
);

// Schema Tools
export const getObjectivesSchema = tool(
  async () => {
    return JSON.stringify({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'uuid' },
          title: { type: 'string', description: 'concise objective title' },
          description: { type: 'string', description: 'detailed description' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string' },
          stakeholders: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string', description: 'brief notes 1-2 sentences max' }
        },
        required: ['id', 'title', 'description', 'priority', 'category', 'stakeholders']
      }
    });
  },
  {
    name: 'get_objectives_schema',
    description: 'Get the JSON schema for mission objectives',
    schema: z.object({})
  }
);

export const saveObjectives = tool(
  async ({ missionId, objectives }: { missionId: string; objectives: any[] }) => {
    await coreFunctions.saveData(missionId, 0, { objectives });
    return `Saved ${objectives.length} objectives to mission ${missionId}.`;
  },
  {
    name: 'save_objectives',
    description: 'DATA: REPLACES ALL existing objectives with new array. Use get_objectives_schema first. For adding to existing, use save_multiple_objectives. For single edits, use update_objective.',
    schema: z.object({ missionId: z.string(), objectives: z.array(ObjectiveSchema) })
  }
);

export const getRequirementsSchema = tool(
  async () => {
    return JSON.stringify({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'uuid' },
          title: { type: 'string', description: 'specific, focused requirement title' },
          type: { type: 'string', enum: ['functional', 'performance', 'interface', 'operational', 'safety', 'environmental'] },
          description: { type: 'string', description: 'concise specification for ONE specific parameter' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          linkedObjectives: { type: 'array', items: { type: 'string' } },
          aiHelperText: { 
            type: 'string', 
            description: 'Plain text guidance for AI validation - describe HOW to check this requirement against design solutions. Do NOT use mathematical formulas. Example: "Check if spacecraft total mass is under 500kg by summing all component masses"' 
          }
        },
        required: ['id', 'title', 'type', 'description', 'priority']
      }
    });
  },
  {
    name: 'get_requirements_schema',
    description: 'Get the JSON schema for mission requirements with AI helper text for validation guidance',
    schema: z.object({})
  }
);

export const saveRequirements = tool(
  async ({ missionId, requirements }: { missionId: string; requirements: any[] }) => {
    await coreFunctions.saveData(missionId, 1, { requirements });
    return `Saved ${requirements.length} requirements to mission ${missionId}.`;
  },
  {
    name: 'save_requirements',
    description: 'DATA: REPLACES ALL existing requirements. For adding to existing, use save_multiple_requirements. For single edits, use update_requirement.',
    schema: z.object({ missionId: z.string(), requirements: z.array(RequirementSchema) })
  }
);

export const getConstraintsSchema = tool(
  async () => {
    return JSON.stringify({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'uuid' },
          title: { type: 'string', description: 'constraint title' },
          constraint_type: { type: 'string', enum: ['budget', 'mass', 'power', 'volume', 'schedule', 'risk', 'technology', 'regulatory'] },
          constraint: {
            type: 'object',
            properties: {
              operator: { type: 'string', enum: ['less_than', 'greater_than', 'equal_to', 'between'] },
              value: { oneOf: [{ type: 'number' }, { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }] },
              unit: { type: 'string' }
            }
          },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          rationale: { type: 'string' },
          is_negotiable: { type: 'boolean' }
        },
        required: ['id', 'title', 'constraint_type', 'constraint', 'priority', 'rationale']
      }
    });
  },
  {
    name: 'get_constraints_schema',
    description: 'Get the JSON schema for mission constraints',
    schema: z.object({})
  }
);

export const saveConstraints = tool(
  async ({ missionId, constraints }: { missionId: string; constraints: any[] }) => {
    await coreFunctions.saveData(missionId, 2, { constraints });
    return `Saved ${constraints.length} constraints to mission ${missionId}.`;
  },
  {
    name: 'save_constraints',
    description: 'DATA: REPLACES ALL existing constraints. For adding to existing, use save_multiple_constraints. For single edits, use update_constraint.',
    schema: z.object({ missionId: z.string(), constraints: z.array(ConstraintSchema) })
  }
);

// Mission Brief and Name Tool
export const saveMissionBriefAndName = tool(
  async ({ missionId, brief, name }: { missionId: string; brief?: string; name?: string }) => {
    try {
      const updateData: any = {};
      if (brief) updateData.brief = brief;
      if (name) updateData.name = name;
      
      await axios.put(`${API_BASE}/missions/${missionId}`, updateData, { headers: getApiHeaders() });
      return `Updated mission ${missionId} with ${Object.keys(updateData).join(' and ')}.`;
    } catch (error) {
      log.error('Failed to update mission', { missionId, error: (error as any).message });
      throw error;
    }
  },
  {
    name: 'save_mission_brief_and_name',
    description: 'Save or update mission brief and/or name',
    schema: z.object({ 
      missionId: z.string(),
      brief: z.string().optional(),
      name: z.string().optional()
    })
  }
);

export const getMissionBriefAndName = tool(
  async ({ missionId }: { missionId: string }) => {
    try {
      const response = await axios.get(`${API_BASE}/missions/${missionId}`, { headers: getApiHeaders() });
      const mission = response.data;
      return `Mission Brief: ${mission.brief}\nMission Name: ${mission.name}`;
    } catch (error) {
      log.error('Failed to get mission brief and name', { missionId, error: (error as any).message });
      throw error;
    }
  },
  {
    name: 'get_mission_brief_and_name',
    description: 'Get the current mission brief and name',
    schema: z.object({ missionId: z.string() })
  }
);



export const getSolutionsSchema = tool(
  async () => {
    return JSON.stringify({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'uuid' },
          name: { type: 'string', description: 'solution name' },
          label: { type: 'string', description: 'short label' },
          status: { type: 'string', enum: ['proposed', 'under_evaluation', 'selected', 'rejected'] },
          spacecraft: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                components: {
                  type: 'array',
                  items: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          type: { type: 'string', enum: ['payload'] },
                          mass: { type: 'number' },
                          powerGenerated: { type: 'number' },
                          powerConsumed: { type: 'number' },
                          cost: { type: 'number' },
                          trl: { type: 'number', minimum: 1, maximum: 9 },
                          reliability: { type: 'number', minimum: 0, maximum: 1 },
                          description: { type: 'string' },
                          focalLength: { type: 'number' },
                          apertureDiameter: { type: 'number' },
                          groundSampleDistance: { type: 'number' },
                          groundSampleDistance_multispectral: { type: 'number' },
                          swathWidth: { type: 'number' },
                          spectralBands: { type: 'array', items: { type: 'object' } },
                          detectorType: { type: 'string' },
                          radiometricResolution: { type: 'number' },
                          dataRate: { type: 'number' },
                          signalToNoiseRatio: { type: 'number' },
                          geolocationAccuracy: { type: 'number' },
                          pointingAccuracy: { type: 'number' },
                          pointingStability: { type: 'number' }
                        },
                        required: ['id', 'name', 'type', 'mass', 'powerGenerated', 'powerConsumed', 'cost', 'trl', 'reliability']
                      },
                      {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          type: { type: 'string', enum: ['power'] },
                          mass: { type: 'number' },
                          powerGenerated: { type: 'number' },
                          powerConsumed: { type: 'number' },
                          cost: { type: 'number' },
                          trl: { type: 'number', minimum: 1, maximum: 9 },
                          reliability: { type: 'number', minimum: 0, maximum: 1 },
                          description: { type: 'string' },
                          batteryCapacity: { type: 'number' },
                          solarArrayArea: { type: 'number' },
                          solarArrayEfficiency: { type: 'number' },
                          batteryType: { type: 'string' },
                          chargeCycles: { type: 'number' }
                        },
                        required: ['id', 'name', 'type', 'mass', 'powerGenerated', 'powerConsumed', 'cost', 'trl', 'reliability']
                      },
                      {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          type: { type: 'string', enum: ['avionics'] },
                          mass: { type: 'number' },
                          powerGenerated: { type: 'number' },
                          powerConsumed: { type: 'number' },
                          cost: { type: 'number' },
                          trl: { type: 'number', minimum: 1, maximum: 9 },
                          reliability: { type: 'number', minimum: 0, maximum: 1 },
                          description: { type: 'string' },
                          processingPower: { type: 'number' },
                          memoryCapacity: { type: 'number' },
                          storageCapacity: { type: 'number' },
                          redundancy: { type: 'string' },
                          operatingSystem: { type: 'string' }
                        },
                        required: ['id', 'name', 'type', 'mass', 'powerGenerated', 'powerConsumed', 'cost', 'trl', 'reliability']
                      },
                      {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          type: { type: 'string', enum: ['adcs'] },
                          mass: { type: 'number' },
                          powerGenerated: { type: 'number' },
                          powerConsumed: { type: 'number' },
                          cost: { type: 'number' },
                          trl: { type: 'number', minimum: 1, maximum: 9 },
                          reliability: { type: 'number', minimum: 0, maximum: 1 },
                          description: { type: 'string' },
                          pointingAccuracy: { type: 'number' },
                          pointingStability: { type: 'number' },
                          attitudeKnowledge: { type: 'number' },
                          slew_rate: { type: 'number' }
                        },
                        required: ['id', 'name', 'type', 'mass', 'powerGenerated', 'powerConsumed', 'cost', 'trl', 'reliability']
                      },
                      {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          type: { type: 'string', enum: ['communications'] },
                          mass: { type: 'number' },
                          powerGenerated: { type: 'number' },
                          powerConsumed: { type: 'number' },
                          cost: { type: 'number' },
                          trl: { type: 'number', minimum: 1, maximum: 9 },
                          reliability: { type: 'number', minimum: 0, maximum: 1 },
                          description: { type: 'string' },
                          dataRate: { type: 'number' },
                          frequency: { type: 'number' },
                          antennaType: { type: 'string' },
                          antennaGain: { type: 'number' },
                          transmitPower: { type: 'number' }
                        },
                        required: ['id', 'name', 'type', 'mass', 'powerGenerated', 'powerConsumed', 'cost', 'trl', 'reliability']
                      },
                      {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          type: { type: 'string', enum: ['structure'] },
                          mass: { type: 'number' },
                          powerGenerated: { type: 'number' },
                          powerConsumed: { type: 'number' },
                          cost: { type: 'number' },
                          trl: { type: 'number', minimum: 1, maximum: 9 },
                          reliability: { type: 'number', minimum: 0, maximum: 1 },
                          description: { type: 'string' },
                          material: { type: 'string' },
                          stiffness: { type: 'number' },
                          dampingRatio: { type: 'number' }
                        },
                        required: ['id', 'name', 'type', 'mass', 'powerGenerated', 'powerConsumed', 'cost', 'trl', 'reliability']
                      },
                      {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          type: { type: 'string', enum: ['thermal'] },
                          mass: { type: 'number' },
                          powerGenerated: { type: 'number' },
                          powerConsumed: { type: 'number' },
                          cost: { type: 'number' },
                          trl: { type: 'number', minimum: 1, maximum: 9 },
                          reliability: { type: 'number', minimum: 0, maximum: 1 },
                          description: { type: 'string' },
                          heatDissipation: { type: 'number' },
                          thermalConductivity: { type: 'number' },
                          operatingTemperatureRange: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }
                        },
                        required: ['id', 'name', 'type', 'mass', 'powerGenerated', 'powerConsumed', 'cost', 'trl', 'reliability']
                      },
                      {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          type: { type: 'string', enum: ['propulsion'] },
                          mass: { type: 'number' },
                          powerGenerated: { type: 'number' },
                          powerConsumed: { type: 'number' },
                          cost: { type: 'number' },
                          trl: { type: 'number', minimum: 1, maximum: 9 },
                          reliability: { type: 'number', minimum: 0, maximum: 1 },
                          description: { type: 'string' },
                          propellantType: { type: 'string' },
                          specificImpulse: { type: 'number' },
                          thrust: { type: 'number' },
                          propellantMass: { type: 'number' },
                          deltaV: { type: 'number' }
                        },
                        required: ['id', 'name', 'type', 'mass', 'powerGenerated', 'powerConsumed', 'cost', 'trl', 'reliability']
                      }
                    ]
                  }
                },
                dryMass: { type: 'number' },
                totalPowerGenerated: { type: 'number' },
                totalPowerConsumed: { type: 'number' },
                totalCost: { type: 'number' }
              },
              required: ['id', 'name', 'components', 'dryMass', 'totalPowerGenerated', 'totalPowerConsumed', 'totalCost']
            }
          },
          orbit: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              altitude: { type: 'number', description: 'km' },
              inclination: { type: 'number', description: 'degrees' },
              eccentricity: { type: 'number', minimum: 0, maximum: 1 },
              period: { type: 'number', description: 'minutes' },
              notes: { type: 'string' }
            },
            required: ['id', 'name', 'altitude', 'inclination', 'eccentricity', 'period', 'notes']
          },
          groundStations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                location: { type: 'string' },
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                monthlyFee: { type: 'number' },
                maxDataRate: { type: 'number' },
                elevationMask: { type: 'number' },
                notes: { type: 'string' }
              },
              required: ['id', 'name', 'location', 'latitude', 'longitude', 'monthlyFee', 'maxDataRate', 'elevationMask', 'notes']
            }
          },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'label', 'status', 'spacecraft', 'groundStations', 'notes', 'createdAt']
      }
    });
  },
  {
    name: 'get_solutions_schema',
    description: 'Get the JSON schema for design solutions',
    schema: z.object({})
  }
);

export const saveSolutions = tool(
  async ({ missionId, designSolutions }: { missionId: string; designSolutions: any[] }) => {
    await coreFunctions.saveData(missionId, 3, { designSolutions });
    return `Saved ${designSolutions.length} design solutions to mission ${missionId}.`;
  },
  {
    name: 'save_solutions',
    description: 'DATA: REPLACES ALL existing design solutions. For adding to existing, use save_multiple_solutions. For component edits, use update_component.',
    schema: z.object({ missionId: z.string(), designSolutions: z.array(DesignSolutionSchema) })
  }
);

// Single entity modification tools
export const updateObjective = tool(
  async ({ missionId, objectiveId, updates }: { missionId: string; objectiveId: string; updates: Record<string, any> }) => {
    const data = await coreFunctions.getMissionData(missionId);
    const updatedObjectives = data.objectives.map((obj: any) => 
      obj.id === objectiveId ? { ...obj, ...updates } : obj
    );
    await coreFunctions.saveData(missionId, 0, { objectives: updatedObjectives });
    return `Updated objective ${objectiveId} in mission ${missionId}.`;
  },
  {
    name: 'update_objective',
    description: 'Update single objective. Use get_mission_data first to find objectiveId. Updates can include: title, description, priority, category, stakeholders, notes.',
    schema: z.object({ 
      missionId: z.string(), 
      objectiveId: z.string(), 
      updates: z.record(z.string(), z.any()) 
    })
  }
);

export const updateRequirement = tool(
  async ({ missionId, requirementId, updates }: { missionId: string; requirementId: string; updates: Record<string, any> }) => {
    const data = await coreFunctions.getMissionData(missionId);
    const updatedRequirements = data.requirements.map((req: any) => 
      req.id === requirementId ? { ...req, ...updates } : req
    );
    await coreFunctions.saveData(missionId, 1, { requirements: updatedRequirements });
    return `Updated requirement ${requirementId} in mission ${missionId}.`;
  },
  {
    name: 'update_requirement',
    description: 'Update a single requirement by ID',
    schema: z.object({ 
      missionId: z.string(), 
      requirementId: z.string(), 
      updates: z.record(z.string(), z.any()) 
    })
  }
);

export const updateConstraint = tool(
  async ({ missionId, constraintId, updates }: { missionId: string; constraintId: string; updates: Record<string, any> }) => {
    const data = await coreFunctions.getMissionData(missionId);
    const updatedConstraints = data.constraints.map((con: any) => 
      con.id === constraintId ? { ...con, ...updates } : con
    );
    await coreFunctions.saveData(missionId, 2, { constraints: updatedConstraints });
    return `Updated constraint ${constraintId} in mission ${missionId}.`;
  },
  {
    name: 'update_constraint',
    description: 'Update a single constraint by ID',
    schema: z.object({ 
      missionId: z.string(), 
      constraintId: z.string(), 
      updates: z.record(z.string(), z.any()) 
    })
  }
);

// Bulk save tools for multiple entities
export const saveMultipleObjectives = tool(
  async ({ missionId, objectives }: { missionId: string; objectives: any[] }) => {
    const existingData = await coreFunctions.getMissionData(missionId);
    const updatedObjectives = [...existingData.objectives, ...objectives];
    await coreFunctions.saveData(missionId, 0, { objectives: updatedObjectives });
    return `Added ${objectives.length} new objectives to mission ${missionId}. Total: ${updatedObjectives.length}.`;
  },
  {
    name: 'save_multiple_objectives',
    description: 'DATA: APPENDS new objectives to existing ones. Preserves all current objectives and adds new ones to the end.',
    schema: z.object({ missionId: z.string(), objectives: z.array(ObjectiveSchema) })
  }
);


export const saveMultipleRequirements = tool(
  async ({ missionId, requirements }: { missionId: string; requirements: any[] }) => {
    const existingData = await coreFunctions.getMissionData(missionId);
    const updatedRequirements = [...existingData.requirements, ...requirements];
    await coreFunctions.saveData(missionId, 1, { requirements: updatedRequirements });
    return `Added ${requirements.length} new requirements to mission ${missionId}. Total: ${updatedRequirements.length}.`;
  },
  {
    name: 'save_multiple_requirements',
    description: 'DATA: APPENDS new requirements to existing ones. Preserves all current requirements and adds new ones.',
    schema: z.object({ missionId: z.string(), requirements: z.array(RequirementSchema) })
  }
);

export const saveMultipleConstraints = tool(
  async ({ missionId, constraints }: { missionId: string; constraints: any[] }) => {
    const existingData = await coreFunctions.getMissionData(missionId);
    const updatedConstraints = [...existingData.constraints, ...constraints];
    await coreFunctions.saveData(missionId, 2, { constraints: updatedConstraints });
    return `Added ${constraints.length} new constraints to mission ${missionId}. Total: ${updatedConstraints.length}.`;
  },
  {
    name: 'save_multiple_constraints',
    description: 'DATA: APPENDS new constraints to existing ones. Preserves all current constraints and adds new ones.',
    schema: z.object({ missionId: z.string(), constraints: z.array(ConstraintSchema) })
  }
);

export const saveMultipleSolutions = tool(
  async ({ missionId, designSolutions }: { missionId: string; designSolutions: any[] }) => {
    const existingData = await coreFunctions.getMissionData(missionId);
    const updatedSolutions = [...existingData.designSolutions, ...designSolutions];
    await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
    return `Added ${designSolutions.length} new design solutions to mission ${missionId}. Total: ${updatedSolutions.length}.`;
  },
  {
    name: 'save_multiple_solutions',
    description: 'DATA: APPENDS new design solutions to existing ones. Preserves all current solutions and adds new ones.',
    schema: z.object({ missionId: z.string(), designSolutions: z.array(DesignSolutionSchema) })
  }
);

// Component Management Tools
export const updateComponentTool = tool(
  async ({ missionId, solutionId, spacecraftId, componentId, updates }: { 
    missionId: string; solutionId: string; spacecraftId: string; componentId: string; updates: Record<string, any>
  }) => {
    const data = await coreFunctions.getMissionData(missionId);
    const solutions = data.designSolutions || [];
    
    const updatedSolutions = solutions.map(sol => {
      if (sol.id === solutionId && sol.spacecraft) {
        return {
          ...sol,
          spacecraft: sol.spacecraft.map((sc: any) => {
            if (sc.id === spacecraftId) {
              return {
                ...sc,
                components: sc.components.map((comp: any) => 
                  comp.id === componentId ? { ...comp, ...updates } : comp
                )
              };
            }
            return sc;
          })
        };
      }
      return sol;
    });
    
    await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
    return `Updated component ${componentId} in spacecraft ${spacecraftId} of solution ${solutionId}.`;
  },
  {
    name: 'update_component',
    description: 'DATA: MODIFIES only the specified component. Preserves all other components and solutions. Use get_mission_data to find IDs.',
    schema: z.object({ 
      missionId: z.string(), 
      solutionId: z.string(), 
      spacecraftId: z.string(), 
      componentId: z.string(), 
      updates: z.record(z.string(), z.any()) 
    })
  }
);

export const addComponentTool = tool(
  async ({ missionId, solutionId, spacecraftId, component }: { 
    missionId: string; solutionId: string; spacecraftId: string; component: any
  }) => {
    const data = await coreFunctions.getMissionData(missionId);
    const solutions = data.designSolutions || [];
    
    const updatedSolutions = solutions.map((sol: any) => {
      if (sol.id === solutionId && sol.spacecraft) {
        return {
          ...sol,
          spacecraft: sol.spacecraft.map((sc: any) => {
            if (sc.id === spacecraftId) {
              return {
                ...sc,
                components: [...sc.components, { id: Date.now().toString(), ...component }]
              };
            }
            return sc;
          })
        };
      }
      return sol;
    });
    
    await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
    return `Added new ${component.type} component to spacecraft ${spacecraftId} in solution ${solutionId}.`;
  },
  {
    name: 'add_component',
    description: 'DATA: ADDS new component to spacecraft. Preserves all existing components. Auto-generates component ID.',
    schema: z.object({ 
      missionId: z.string(), 
      solutionId: z.string(), 
      spacecraftId: z.string(), 
      component: ComponentSchema
    })
  }
);

export const removeComponentTool = tool(
  async ({ missionId, solutionId, spacecraftId, componentId }: { 
    missionId: string; solutionId: string; spacecraftId: string; componentId: string 
  }) => {
    const data = await coreFunctions.getMissionData(missionId);
    const solutions = data.designSolutions || [];
    
    const updatedSolutions = solutions.map((sol: any) => {
      if (sol.id === solutionId && sol.spacecraft) {
        return {
          ...sol,
          spacecraft: sol.spacecraft.map((sc: any) => {
            if (sc.id === spacecraftId) {
              return {
                ...sc,
                components: sc.components.filter((comp: any) => comp.id !== componentId)
              };
            }
            return sc;
          })
        };
      }
      return sol;
    });
    
    await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
    return `Removed component ${componentId} from spacecraft ${spacecraftId} in solution ${solutionId}.`;
  },
  {
    name: 'remove_component',
    description: 'DATA: DELETES specified component only. Preserves all other components and solutions. Permanent deletion.',
    schema: z.object({ 
      missionId: z.string(), 
      solutionId: z.string(), 
      spacecraftId: z.string(), 
      componentId: z.string() 
    })
  }
);

// Orbit Management Tools
export const updateOrbitTool = tool(
  async ({ missionId, solutionId, orbitUpdates }: { missionId: string; solutionId: string; orbitUpdates: Record<string, any> }) => {
    const data = await coreFunctions.getMissionData(missionId);
    const solutions = data.designSolutions || [];
    
    const updatedSolutions = solutions.map((sol: any) => 
      sol.id === solutionId ? { ...sol, orbit: { ...sol.orbit, ...orbitUpdates } } : sol
    );
    
    await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
    return `Updated orbit parameters for solution ${solutionId}.`;
  },
  {
    name: 'update_orbit',
    description: 'Update orbit parameters for a design solution',
    schema: z.object({ 
      missionId: z.string(), 
      solutionId: z.string(), 
      orbitUpdates: z.record(z.string(), z.any()) 
    })
  }
);

// Internet Search Tool
export const searchInternetTool = tool(
  async ({ query }: { query: string }) => {
    try {
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const response = await axios.get(searchUrl, { timeout: 10000 });
      
      let results = [];
      
      if (response.data.Abstract) {
        results.push({
          title: response.data.Heading || 'Abstract',
          content: response.data.Abstract,
          source: response.data.AbstractSource || 'DuckDuckGo'
        });
      }
      
      if (response.data.RelatedTopics && response.data.RelatedTopics.length > 0) {
        response.data.RelatedTopics.slice(0, 3).forEach((topic: any) => {
          if (topic.Text) {
            results.push({
              title: topic.FirstURL ? topic.FirstURL.split('/').pop() : 'Related Topic',
              content: topic.Text,
              source: topic.FirstURL || 'DuckDuckGo'
            });
          }
        });
      }
      
      if (results.length === 0) {
        return `No specific results found for "${query}". Consider refining your search terms or asking about general spacecraft design principles.`;
      }
      
      const formattedResults = results.map(r => 
        `**${r.title}**\n${r.content}\nSource: ${r.source}`
      ).join('\n\n');
      
      return `Search results for "${query}":\n\n${formattedResults}`;
      
    } catch (error) {
      log.warn('Internet search failed, providing fallback response', { error: (error as Error).message });
      return `Unable to search the internet at this time. However, I can help with general spacecraft design knowledge. What specific aspect of "${query}" would you like to know about?`;
    }
  },
  {
    name: 'search_internet',
    description: 'Use for current component specs, mission examples, technical standards. Search before adding/updating components for accurate specifications.',
    schema: z.object({ query: z.string() })
  }
);



// Ground Track Calculation Tool
export const calculateGroundTrackTool = tool(
  async ({ altitude, inclination, eccentricity, raan, argumentOfPerigee, trueAnomaly, numPoints, numOrbits }: {
    altitude: number;
    inclination: number;
    eccentricity?: number;
    raan?: number;
    argumentOfPerigee?: number;
    trueAnomaly?: number;
    numPoints?: number;
    numOrbits?: number;
  }) => {
    // Import ground track calculation from local file
    const { calculateGroundTrack } = await import('./ground-track');
    
    const trackPoints = calculateGroundTrack(
      altitude,
      inclination,
      eccentricity || 0,
      raan || 0,
      argumentOfPerigee || 0,
      trueAnomaly || 0,
      numPoints || 100,
      numOrbits || 1
    );
    
    // Format for agent consumption
    const formattedTrack = trackPoints.map(point => ({
      latitude: parseFloat(point.latitude.toFixed(4)),
      longitude: parseFloat(point.longitude.toFixed(4)),
      time: parseFloat(point.time.toFixed(2))
    }));
    
    const summary = {
      totalPoints: formattedTrack.length,
      latitudeRange: {
        min: Math.min(...formattedTrack.map(p => p.latitude)),
        max: Math.max(...formattedTrack.map(p => p.latitude))
      },
      longitudeRange: {
        min: Math.min(...formattedTrack.map(p => p.longitude)),
        max: Math.max(...formattedTrack.map(p => p.longitude))
      },
      orbitalPeriod: trackPoints.length > 0 ? trackPoints[trackPoints.length - 1].time / (numOrbits || 1) : 0
    };
    
    return {
      success: true,
      groundTrack: formattedTrack,
      summary,
      description: `Ground track calculated for ${numOrbits} orbit(s) at ${altitude}km altitude, ${inclination}° inclination`
    };
  },
  {
    name: 'calculate_ground_track',
    description: 'Calculate satellite ground track coordinates for visualization and coverage analysis',
    schema: z.object({
      altitude: z.number().describe('Orbital altitude in km'),
      inclination: z.number().describe('Orbital inclination in degrees'),
      eccentricity: z.number().optional().describe('Orbital eccentricity (default: 0)'),
      raan: z.number().optional().describe('Right Ascension of Ascending Node in degrees (default: 0)'),
      argumentOfPerigee: z.number().optional().describe('Argument of perigee in degrees (default: 0)'),
      trueAnomaly: z.number().optional().describe('True anomaly in degrees (default: 0)'),
      numPoints: z.number().optional().describe('Number of points per orbit (default: 100)'),
      numOrbits: z.number().optional().describe('Number of orbits to calculate (default: 1)')
    })
  }
);

// Flight Dynamics Tool
export const flightDynamicsTool = tool(
  async ({ altitude, inclination, eccentricity, swathWidth, dataRate, numSpacecraft, groundStations }: {
    altitude: number;
    inclination: number;
    eccentricity?: number;
    swathWidth?: number;
    dataRate?: number;
    numSpacecraft?: number;
    groundStations?: Array<{latitude: number, maxDataRate: number}>;
  }) => {
    const { FlightDynamicsCalculator } = await import('./flight-dynamics');
    
    const orbit = {
      altitude,
      inclination,
      eccentricity: eccentricity || 0
    };
    
    // Convert ground stations format for single spacecraft analysis
    const gsForAnalysis = groundStations?.map(gs => ({
      latitude: gs.latitude,
      name: `Station_${gs.latitude}`,
      maxDataRate: gs.maxDataRate
    }));
    
    const results = FlightDynamicsCalculator.performCompleteAnalysis(
      orbit,
      swathWidth || 100,
      dataRate || 100,
      gsForAnalysis
    );
    
    let constellationResults = null;
    if (numSpacecraft && numSpacecraft > 1) {
      constellationResults = FlightDynamicsCalculator.analyzeConstellation(
        numSpacecraft,
        orbit,
        swathWidth || 100,
        groundStations || [{latitude: 45, maxDataRate: dataRate || 100}]
      );
    }
    
    return {
      success: true,
      results,
      constellationResults,
      summary: constellationResults 
        ? `Constellation analysis: ${numSpacecraft} spacecraft, Revisit=${constellationResults.constellationRevisitTime.toFixed(1)}hrs, Coverage=${constellationResults.constellationCoverage.toFixed(1)}%`
        : `Orbital analysis: Period=${results.orbitalPeriod.toFixed(1)}min, Velocity=${results.orbitalVelocity.toFixed(2)}km/s, Revisit=${results.revisitTime.toFixed(1)}hrs`
    };
  },
  {
    name: 'flight_dynamics',
    description: 'ALWAYS use after orbit/component changes. Calculates orbital mechanics, revisit times, coverage. Use constellation analysis (numSpacecraft>1) for multiple satellites.',
    schema: z.object({
      altitude: z.number().describe('Orbital altitude in km'),
      inclination: z.number().describe('Orbital inclination in degrees'),
      eccentricity: z.number().optional().describe('Orbital eccentricity (default: 0)'),
      swathWidth: z.number().optional().describe('Instrument swath width in km (default: 100)'),
      dataRate: z.number().optional().describe('Data rate in Mbps (default: 100)'),
      numSpacecraft: z.number().optional().describe('Number of spacecraft in constellation (default: 1)'),
      groundStations: z.array(z.object({
        latitude: z.number(),
        maxDataRate: z.number()
      })).optional().describe('Ground stations with latitude and data rate')
    })
  }
);

// Validation Reports Tool
export const saveValidationReportsTool = tool(
  async ({ missionId, solutionId, reports }: { 
    missionId: string; 
    solutionId: string; 
    reports: Array<{ requirementId: string; status: string; explanation: string; actualValue?: string; requiredValue?: string }>
  }) => {
    // Get existing validation data to avoid overwriting other solutions
    const existingData = await coreFunctions.getData(missionId, 4) || {};
    const updatedData = { ...existingData, [`validation_${solutionId}`]: reports };
    await coreFunctions.saveData(missionId, 4, updatedData);
    return `Saved ${reports.length} validation reports for solution ${solutionId}.`;
  },
  {
    name: 'save_validation_reports',
    description: 'DATA: ADDS validation for specific solution. Preserves validation reports for other solutions. ALWAYS use after creating solutions.',
    schema: z.object({
      missionId: z.string(),
      solutionId: z.string(),
      reports: z.array(ValidationReportSchema)
    })
  }
);

// Export all tools as an array
export const allTools = [
  getMissionDataTool,
  getMissionBriefAndName,
  saveMissionBriefAndName,

  getObjectivesSchema,
  saveObjectives,
  updateObjective,
  saveMultipleObjectives,

  getRequirementsSchema,
  saveRequirements,
  updateRequirement,
  saveMultipleRequirements,

  getConstraintsSchema,
  saveConstraints,
  updateConstraint,
  saveMultipleConstraints,

  getSolutionsSchema,
  saveSolutions,
  saveMultipleSolutions,

  updateComponentTool,
  addComponentTool,
  removeComponentTool,

  updateOrbitTool,
  searchInternetTool,
  flightDynamicsTool,
  calculateGroundTrackTool,
  saveValidationReportsTool
];