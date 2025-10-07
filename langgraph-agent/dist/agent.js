"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const openai_1 = require("@langchain/openai");
const tools_1 = require("@langchain/core/tools");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const messages_1 = require("@langchain/core/messages");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
// Logging utility
const log = {
    info: (msg, data) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data || ''),
    error: (msg, error) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error || ''),
    debug: (msg, data) => console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data || '')
};
// LLM setup
const llm = new openai_1.ChatOpenAI({
    modelName: 'gpt-5-mini',
    temperature: 1,
    openAIApiKey: process.env.OPENAI_API_KEY
});
// API configuration
const API_BASE = process.env.API_BASE || 'https://paf4sflt0a.execute-api.eu-central-1.amazonaws.com/dev';
// Core functions
const coreFunctions = {
    async getMissionData(missionId) {
        log.debug('📡 Fetching mission data', { missionId, apiBase: API_BASE });
        try {
            const missionResponse = await axios_1.default.get(`${API_BASE}/missions/${missionId}`);
            log.debug('✅ Mission basic data retrieved', { status: missionResponse.status });
            const [objectivesRes, requirementsRes, constraintsRes, solutionsRes] = await Promise.all([
                axios_1.default.get(`${API_BASE}/missions/${missionId}/tabs/0`).catch(e => ({ data: null, error: e.message })),
                axios_1.default.get(`${API_BASE}/missions/${missionId}/tabs/1`).catch(e => ({ data: null, error: e.message })),
                axios_1.default.get(`${API_BASE}/missions/${missionId}/tabs/2`).catch(e => ({ data: null, error: e.message })),
                axios_1.default.get(`${API_BASE}/missions/${missionId}/tabs/3`).catch(e => ({ data: null, error: e.message }))
            ]);
            log.debug('📊 Tab data retrieved', {
                objectives: objectivesRes.data ? 'success' : `error: ${'error' in objectivesRes ? objectivesRes.error : 'unknown'}`,
                requirements: requirementsRes.data ? 'success' : `error: ${'error' in requirementsRes ? requirementsRes.error : 'unknown'}`,
                constraints: constraintsRes.data ? 'success' : `error: ${'error' in constraintsRes ? constraintsRes.error : 'unknown'}`,
                solutions: solutionsRes.data ? 'success' : `error: ${'error' in solutionsRes ? solutionsRes.error : 'unknown'}`
            });
            return {
                mission: missionResponse.data,
                objectives: objectivesRes.data?.objectives || [],
                requirements: requirementsRes.data?.requirements || [],
                constraints: constraintsRes.data?.constraints || [],
                designSolutions: solutionsRes.data?.designSolutions || []
            };
        }
        catch (error) {
            log.error('❌ Failed to fetch mission data', {
                missionId,
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText
            });
            throw error;
        }
    },
    async saveData(missionId, tabIndex, data) {
        await axios_1.default.put(`${API_BASE}/missions/${missionId}/tabs/${tabIndex}`, data);
    }
};
// Debug wrapper for tools
const withLogging = (toolName, func) => {
    return async (input) => {
        log.debug(`🔧 Tool called: ${toolName}`, { input });
        const startTime = Date.now();
        try {
            const result = await func(input);
            const duration = Date.now() - startTime;
            log.debug(`✅ Tool completed: ${toolName}`, { duration: `${duration}ms`, resultLength: result.length });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            log.error(`❌ Tool failed: ${toolName}`, { duration: `${duration}ms`, error: error.message });
            throw error;
        }
    };
};
// Tools
const getMissionDataTool = new tools_1.DynamicTool({
    name: 'get_mission_data',
    description: 'Get current mission data including objectives, requirements, constraints, and design solutions. Input: {"missionId": "string"}',
    func: withLogging('get_mission_data', async (input) => {
        const { missionId } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        return JSON.stringify(data, null, 2);
    })
});
const generateObjectivesTool = new tools_1.DynamicTool({
    name: 'generate_objectives',
    description: 'Generate new mission objectives based on mission brief. Input: {"missionId": "string", "brief": "string"}',
    func: withLogging('generate_objectives', async (input) => {
        const { missionId, brief } = JSON.parse(input);
        const prompt = `As an Earth Observation SMAD expert, generate 3 realistic mission objectives for: "${brief}". Focus on EO applications: agriculture monitoring, disaster response, climate studies, urban planning, environmental monitoring. Consider user needs, data products, and operational requirements.

Return ONLY valid JSON array matching this schema:
[{
  "id": "string (uuid)",
  "title": "string (concise objective title)",
  "description": "string (detailed description)",
  "priority": "string (High|Medium|Low)",
  "category": "string (Scientific|Operational|Technical|Commercial)",
  "stakeholders": "string (comma-separated list)",
  "notes": "string (additional context)"
}]`;
        const response = await llm.invoke(prompt);
        const objectives = JSON.parse(response.content.toString().replace(/```json\n?/g, '').replace(/```/g, ''));
        await coreFunctions.saveData(missionId, 0, { objectives });
        return `Generated ${objectives.length} objectives and saved to mission.`;
    })
});
const generateRequirementsTool = new tools_1.DynamicTool({
    name: 'generate_requirements',
    description: 'Generate technical REQUIREMENTS (what the system must do/achieve) based on mission objectives. Input: {"missionId": "string", "objectives": "array"}',
    func: withLogging('generate_requirements', async (input) => {
        const { missionId, objectives } = JSON.parse(input);
        const prompt = `As an Earth Observation SMAD expert, generate 6 technical REQUIREMENTS based on: ${JSON.stringify(objectives)}. Focus on EO-specific requirements: Ground Sample Distance (GSD), swath width, revisit time, spectral bands, radiometric accuracy, geolocation accuracy, data latency, coverage area.

Return ONLY valid JSON array matching this schema:
[{
  "id": "string (uuid)",
  "title": "string (requirement title)",
  "type": "string (Performance|Functional|Interface|Environmental|Operational)",
  "description": "string (detailed requirement specification)",
  "priority": "string (High|Medium|Low)"
}]`;
        const response = await llm.invoke(prompt);
        const requirements = JSON.parse(response.content.toString().replace(/```json\n?/g, '').replace(/```/g, ''));
        await coreFunctions.saveData(missionId, 1, { requirements });
        return `Generated ${requirements.length} requirements and saved to mission.`;
    })
});
const generateConstraintsTool = new tools_1.DynamicTool({
    name: 'generate_constraints',
    description: 'Generate mission CONSTRAINTS (limitations/boundaries) based on objectives and requirements. Input: {"missionId": "string", "objectives": "array", "requirements": "array"}',
    func: withLogging('generate_constraints', async (input) => {
        const { missionId, objectives, requirements } = JSON.parse(input);
        const prompt = `As an Earth Observation SMAD expert, generate 5 realistic CONSTRAINTS based on objectives and requirements. Consider EO mission limits: mass (100-2000kg), power (500-5000W), cost ($10M-$200M), launch vehicle constraints, sun-synchronous orbit requirements, ground station coverage.

Return ONLY valid JSON array matching this schema:
[{
  "id": "string (uuid)",
  "title": "string (constraint title)",
  "constraint_type": "string (Mass|Power|Thermal|Cost|Schedule|Launch|Regulatory)",
  "constraint": {
    "operator": "string (<|<=|>|>=|=)",
    "value": "number",
    "unit": "string (kg|W|$|m|days|etc)"
  },
  "priority": "string (High|Medium|Low)",
  "rationale": "string (why this constraint exists)",
  "is_negotiable": "boolean"
}]`;
        const response = await llm.invoke(prompt);
        const constraints = JSON.parse(response.content.toString().replace(/```json\n?/g, '').replace(/```/g, ''));
        await coreFunctions.saveData(missionId, 2, { constraints });
        return `Generated ${constraints.length} constraints and saved to mission.`;
    })
});
const generateSolutionsTool = new tools_1.DynamicTool({
    name: 'generate_solutions',
    description: 'Generate spacecraft design solutions based on objectives, requirements, and constraints. Input: {"missionId": "string", "objectives": "array", "requirements": "array", "constraints": "array"}',
    func: withLogging('generate_solutions', async (input) => {
        const { missionId, objectives, requirements, constraints } = JSON.parse(input);
        const prompt = `As an Earth Observation SMAD expert, generate 2 realistic spacecraft design solutions considering: ${JSON.stringify({ objectives, requirements, constraints })}. Include EO-specific components with realistic specifications.

Return ONLY valid JSON array matching this exact schema:
[{
  "id": "string (uuid)",
  "name": "string (solution name)",
  "label": "string (short label)",
  "status": "string (proposed|under_evaluation|selected|rejected)",
  "spacecraft": {
    "id": "string (uuid)",
    "name": "string (spacecraft name)",
    "components": [{
      "id": "string (uuid)",
      "name": "string (component name)",
      "type": "string (payload|power|avionics|adcs|communications|structure|thermal|propulsion)",
      "mass": "number (kg)",
      "powerGenerated": "number (W, 0 for non-power components)",
      "powerConsumed": "number (W)",
      "cost": "number (USD)",
      "trl": "number (1-9)",
      "reliability": "number (0-1)",
      "description": "string",
      "focalLength": "number (meters, payload only)",
      "groundSampleDistance": "number (meters, payload only)",
      "swathWidth": "number (km, payload only)",
      "batteryCapacity": "number (Wh, power only)",
      "solarArrayArea": "number (m², power only)",
      "processingPower": "number (MIPS, avionics only)",
      "storageCapacity": "number (GB, avionics only)"
    }],
    "dryMass": "number (total kg)",
    "totalPowerGenerated": "number (total W)",
    "totalPowerConsumed": "number (total W)",
    "totalCost": "number (total USD)"
  },
  "orbit": {
    "id": "string (uuid)",
    "name": "string (orbit name)",
    "altitude": "number (km)",
    "inclination": "number (degrees)",
    "eccentricity": "number (0-1)",
    "period": "number (minutes)",
    "notes": "string"
  },
  "groundStations": [{
    "id": "string (uuid)",
    "name": "string (station name)",
    "location": "string (city, country)",
    "latitude": "number (degrees)",
    "longitude": "number (degrees)",
    "monthlyFee": "number (USD)",
    "maxDataRate": "number (Mbps)",
    "elevationMask": "number (degrees)",
    "notes": "string"
  }],
  "notes": "string",
  "createdAt": "string (ISO date)"
}]`;
        const response = await llm.invoke(prompt);
        const designSolutions = JSON.parse(response.content.toString().replace(/```json\n?/g, '').replace(/```/g, ''));
        await coreFunctions.saveData(missionId, 3, { designSolutions });
        return `Generated ${designSolutions.length} design solutions and saved to mission.`;
    })
});
// Granular editing tools
const updateComponentTool = new tools_1.DynamicTool({
    name: 'update_component',
    description: 'Update a specific component in a design solution. Input: {"missionId": "string", "solutionId": "string", "componentId": "string", "updates": "object"}',
    func: withLogging('update_component', async (input) => {
        const { missionId, solutionId, componentId, updates } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const solutions = data.designSolutions || [];
        const updatedSolutions = solutions.map(sol => {
            if (sol.id === solutionId && sol.spacecraft) {
                return {
                    ...sol,
                    spacecraft: {
                        ...sol.spacecraft,
                        components: sol.spacecraft.components.map((comp) => comp.id === componentId ? { ...comp, ...updates } : comp)
                    }
                };
            }
            return sol;
        });
        await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
        return `Updated component ${componentId} in solution ${solutionId}.`;
    })
});
const updateOrbitTool = new tools_1.DynamicTool({
    name: 'update_orbit',
    description: 'Update orbit parameters for a design solution. Input: {"missionId": "string", "solutionId": "string", "orbitUpdates": "object"}',
    func: withLogging('update_orbit', async (input) => {
        const { missionId, solutionId, orbitUpdates } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const solutions = data.designSolutions || [];
        const updatedSolutions = solutions.map((sol) => sol.id === solutionId ? { ...sol, orbit: { ...sol.orbit, ...orbitUpdates } } : sol);
        await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
        return `Updated orbit parameters for solution ${solutionId}.`;
    })
});
const updateGroundStationTool = new tools_1.DynamicTool({
    name: 'update_ground_station',
    description: 'Update a specific ground station in a design solution. Input: {"missionId": "string", "solutionId": "string", "stationId": "string", "stationUpdates": "object"}',
    func: withLogging('update_ground_station', async (input) => {
        const { missionId, solutionId, stationId, stationUpdates } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const solutions = data.designSolutions || [];
        const updatedSolutions = solutions.map((sol) => {
            if (sol.id === solutionId) {
                return {
                    ...sol,
                    groundStations: sol.groundStations.map((station) => station.id === stationId ? { ...station, ...stationUpdates } : station)
                };
            }
            return sol;
        });
        await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
        return `Updated ground station ${stationId} in solution ${solutionId}.`;
    })
});
const addComponentTool = new tools_1.DynamicTool({
    name: 'add_component',
    description: 'Add a new component to a spacecraft in a design solution. Input: {"missionId": "string", "solutionId": "string", "component": "object"}',
    func: withLogging('add_component', async (input) => {
        const { missionId, solutionId, component } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const solutions = data.designSolutions || [];
        const updatedSolutions = solutions.map((sol) => {
            if (sol.id === solutionId && sol.spacecraft) {
                return {
                    ...sol,
                    spacecraft: {
                        ...sol.spacecraft,
                        components: [...sol.spacecraft.components, { id: Date.now().toString(), ...component }]
                    }
                };
            }
            return sol;
        });
        await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
        return `Added new ${component.type} component to solution ${solutionId}.`;
    })
});
const removeComponentTool = new tools_1.DynamicTool({
    name: 'remove_component',
    description: 'Remove a component from a spacecraft in a design solution. Input: {"missionId": "string", "solutionId": "string", "componentId": "string"}',
    func: withLogging('remove_component', async (input) => {
        const { missionId, solutionId, componentId } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const solutions = data.designSolutions || [];
        const updatedSolutions = solutions.map((sol) => {
            if (sol.id === solutionId && sol.spacecraft) {
                return {
                    ...sol,
                    spacecraft: {
                        ...sol.spacecraft,
                        components: sol.spacecraft.components.filter((comp) => comp.id !== componentId)
                    }
                };
            }
            return sol;
        });
        await coreFunctions.saveData(missionId, 3, { designSolutions: updatedSolutions });
        return `Removed component ${componentId} from solution ${solutionId}.`;
    })
});
// Granular editing tools for objectives, requirements, constraints
const updateObjectiveTool = new tools_1.DynamicTool({
    name: 'update_objective',
    description: 'Update a specific objective. Input: {"missionId": "string", "objectiveId": "string", "updates": "object"}',
    func: withLogging('update_objective', async (input) => {
        const { missionId, objectiveId, updates } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const objectives = data.objectives || [];
        const updatedObjectives = objectives.map((obj) => obj.id === objectiveId ? { ...obj, ...updates } : obj);
        await coreFunctions.saveData(missionId, 0, { objectives: updatedObjectives });
        return `Updated objective ${objectiveId}.`;
    })
});
const addObjectiveTool = new tools_1.DynamicTool({
    name: 'add_objective',
    description: 'Add a new objective to the mission. Input: {"missionId": "string", "objective": "object"}',
    func: withLogging('add_objective', async (input) => {
        const { missionId, objective } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const objectives = data.objectives || [];
        const newObjective = { id: Date.now().toString(), ...objective };
        const updatedObjectives = [...objectives, newObjective];
        await coreFunctions.saveData(missionId, 0, { objectives: updatedObjectives });
        return `Added new objective: ${objective.title}.`;
    })
});
const removeObjectiveTool = new tools_1.DynamicTool({
    name: 'remove_objective',
    description: 'Remove an objective from the mission. Input: {"missionId": "string", "objectiveId": "string"}',
    func: withLogging('remove_objective', async (input) => {
        const { missionId, objectiveId } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const objectives = data.objectives || [];
        const updatedObjectives = objectives.filter((obj) => obj.id !== objectiveId);
        await coreFunctions.saveData(missionId, 0, { objectives: updatedObjectives });
        return `Removed objective ${objectiveId}.`;
    })
});
const updateRequirementTool = new tools_1.DynamicTool({
    name: 'update_requirement',
    description: 'Update a specific requirement. Input: {"missionId": "string", "requirementId": "string", "updates": "object"}',
    func: withLogging('update_requirement', async (input) => {
        const { missionId, requirementId, updates } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const requirements = data.requirements || [];
        const updatedRequirements = requirements.map((req) => req.id === requirementId ? { ...req, ...updates } : req);
        await coreFunctions.saveData(missionId, 1, { requirements: updatedRequirements });
        return `Updated requirement ${requirementId}.`;
    })
});
const addRequirementTool = new tools_1.DynamicTool({
    name: 'add_requirement',
    description: 'Add a new requirement to the mission. Input: {"missionId": "string", "requirement": "object"}',
    func: withLogging('add_requirement', async (input) => {
        const { missionId, requirement } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const requirements = data.requirements || [];
        const newRequirement = { id: Date.now().toString(), ...requirement };
        const updatedRequirements = [...requirements, newRequirement];
        await coreFunctions.saveData(missionId, 1, { requirements: updatedRequirements });
        return `Added new requirement: ${requirement.title}.`;
    })
});
const removeRequirementTool = new tools_1.DynamicTool({
    name: 'remove_requirement',
    description: 'Remove a requirement from the mission. Input: {"missionId": "string", "requirementId": "string"}',
    func: withLogging('remove_requirement', async (input) => {
        const { missionId, requirementId } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const requirements = data.requirements || [];
        const updatedRequirements = requirements.filter((req) => req.id !== requirementId);
        await coreFunctions.saveData(missionId, 1, { requirements: updatedRequirements });
        return `Removed requirement ${requirementId}.`;
    })
});
const updateConstraintTool = new tools_1.DynamicTool({
    name: 'update_constraint',
    description: 'Update a specific constraint. Input: {"missionId": "string", "constraintId": "string", "updates": "object"}',
    func: withLogging('update_constraint', async (input) => {
        const { missionId, constraintId, updates } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const constraints = data.constraints || [];
        const updatedConstraints = constraints.map((con) => con.id === constraintId ? { ...con, ...updates } : con);
        await coreFunctions.saveData(missionId, 2, { constraints: updatedConstraints });
        return `Updated constraint ${constraintId}.`;
    })
});
const addConstraintTool = new tools_1.DynamicTool({
    name: 'add_constraint',
    description: 'Add a new constraint to the mission. Input: {"missionId": "string", "constraint": "object"}',
    func: withLogging('add_constraint', async (input) => {
        const { missionId, constraint } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const constraints = data.constraints || [];
        const newConstraint = { id: Date.now().toString(), ...constraint };
        const updatedConstraints = [...constraints, newConstraint];
        await coreFunctions.saveData(missionId, 2, { constraints: updatedConstraints });
        return `Added new constraint: ${constraint.title}.`;
    })
});
const removeConstraintTool = new tools_1.DynamicTool({
    name: 'remove_constraint',
    description: 'Remove a constraint from the mission. Input: {"missionId": "string", "constraintId": "string"}',
    func: withLogging('remove_constraint', async (input) => {
        const { missionId, constraintId } = JSON.parse(input);
        const data = await coreFunctions.getMissionData(missionId);
        const constraints = data.constraints || [];
        const updatedConstraints = constraints.filter((con) => con.id !== constraintId);
        await coreFunctions.saveData(missionId, 2, { constraints: updatedConstraints });
        return `Removed constraint ${constraintId}.`;
    })
});
// Internet search tool
const searchInternetTool = new tools_1.DynamicTool({
    name: 'search_internet',
    description: 'Search the internet for current information about spacecraft, components, missions, groundstations or technical specifications. Input: "search query string" or {"query": "search terms"}',
    func: withLogging('search_internet', async (input) => {
        let query;
        // Handle both JSON input and plain string input
        if (input.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(input);
                query = parsed.query || parsed.input || input;
            }
            catch {
                query = input;
            }
        }
        else {
            // Direct string input
            query = input;
        }
        try {
            // Using DuckDuckGo Instant Answer API as a simple search option
            const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const response = await axios_1.default.get(searchUrl, { timeout: 10000 });
            let results = [];
            // Extract relevant information from DuckDuckGo response
            if (response.data.Abstract) {
                results.push({
                    title: response.data.Heading || 'Abstract',
                    content: response.data.Abstract,
                    source: response.data.AbstractSource || 'DuckDuckGo'
                });
            }
            if (response.data.RelatedTopics && response.data.RelatedTopics.length > 0) {
                response.data.RelatedTopics.slice(0, 3).forEach((topic) => {
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
            const formattedResults = results.map(r => `**${r.title}**\n${r.content}\nSource: ${r.source}`).join('\n\n');
            return `Search results for "${query}":\n\n${formattedResults}`;
        }
        catch (error) {
            log.warn('Internet search failed, providing fallback response', { error: error.message });
            return `Unable to search the internet at this time. However, I can help with general spacecraft design knowledge. What specific aspect of "${query}" would you like to know about?`;
        }
    })
});
const tools = [getMissionDataTool, generateObjectivesTool, generateRequirementsTool, generateConstraintsTool, generateSolutionsTool, updateComponentTool, updateOrbitTool, updateGroundStationTool, addComponentTool, removeComponentTool, updateObjectiveTool, addObjectiveTool, removeObjectiveTool, updateRequirementTool, addRequirementTool, removeRequirementTool, updateConstraintTool, addConstraintTool, removeConstraintTool, searchInternetTool];
const systemPrompt = `You are an expert SMAD (Space Mission Analysis and Design) assistant specializing in EARTH OBSERVATION missions for EARLY MISSION ANALYSIS (Phase A/B conceptual design). Keep analysis at appropriate conceptual level - not detailed engineering. Focus on:

EARTH OBSERVATION EXPERTISE:
- Imaging: Optical, multispectral, hyperspectral, SAR, thermal
- Applications: Agriculture, forestry, urban planning, disaster monitoring, climate
- Ground Sample Distance (GSD): 0.3m-30m depending on mission
- Swath width: 10km-2000km trade-offs with resolution
- Revisit time: Daily to monthly depending on constellation
- Sun-synchronous orbits: 600-800km altitude for consistent lighting

SPACECRAFT SUBSYSTEMS:
- Payload: Optical telescopes, SAR antennas, multispectral sensors
- Power: Solar arrays (2-15kW), batteries for eclipse periods
- Propulsion: Hydrazine thrusters for orbit maintenance
- ADCS: High-precision pointing (0.01-0.1°) for imaging
- Thermal: Cryocoolers for IR sensors, thermal stability
- Structure: Vibration isolation, deployable solar arrays
- C&DH: High-capacity storage (TB), image processing
- Communications: X-band downlink (100Mbps-8Gbps)

ORBITAL MECHANICS:
- Sun-synchronous LEO (600-800km): Consistent lighting, global coverage
- Polar orbits: Complete Earth coverage
- Repeat ground track: Systematic observation patterns

GRANULAR EDITING CAPABILITIES:
- OBJECTIVES: Update/add/remove mission objectives (title, description, priority, stakeholders)
- REQUIREMENTS: Update/add/remove technical requirements (type, description, priority)
- CONSTRAINTS: Update/add/remove mission constraints (values, operators, rationale)
- COMPONENTS: Update specific components (mass, power, cost, specifications)
- ORBIT: Modify orbit parameters (altitude, inclination, period)
- GROUND STATIONS: Edit ground station details (location, data rates, costs)
- Add/remove any mission element for iterative design refinement

INTERNET SEARCH CAPABILITIES:
- Search for current spacecraft specifications and performance data
- Look up recent mission examples and lessons learned
- Find technical standards and industry best practices
- Research component manufacturers and suppliers
- Get updated cost estimates and market information

EARLY MISSION ANALYSIS APPROACH:
- Use order-of-magnitude estimates and parametric models
- Focus on mission architecture and concept feasibility
- Provide ranges rather than precise values (e.g., "100-500kg" not "347.2kg")
- Consider heritage systems and proven technologies
- Emphasize trade-offs and design drivers
- Keep component specifications at subsystem level
- Use industry-standard assumptions and scaling laws

IMPORTANT DISTINCTIONS:
- REQUIREMENTS: What the system must DO/ACHIEVE (GSD, swath, revisit time)
- CONSTRAINTS: LIMITATIONS/BOUNDARIES (mass <2000kg, power <5kW, cost <$50M)

When users ask to generate content, use the appropriate tools to actually create and save it.
When users want to modify existing solutions, use granular editing tools for precise updates.
When users ask about current information, recent missions, or specific components, use internet search to get up-to-date data.
Always get mission data first to understand the current state before making recommendations.`;
const agent = (0, prebuilt_1.createReactAgent)({ llm, tools, messageModifier: systemPrompt });
// Express server
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Chat endpoint
app.post('/chat', async (req, res) => {
    const { message, missionId } = req.body;
    log.debug('Chat request received', { message: message?.substring(0, 50) + '...', missionId });
    try {
        // Inject missionId into tools context
        const contextualTools = tools.map(tool => new tools_1.DynamicTool({
            name: tool.name,
            description: tool.description,
            func: async (input) => {
                log.debug(`🔍 Raw tool input for ${tool.name}:`, { input, type: typeof input });
                let parsedInput = {};
                try {
                    parsedInput = input && input !== 'undefined' ? JSON.parse(input) : {};
                }
                catch (e) {
                    log.warn(`⚠️ Failed to parse tool input, using empty object:`, { input, error: e.message });
                }
                const finalInput = JSON.stringify({ missionId, ...parsedInput });
                log.debug(`🔄 Processed tool input for ${tool.name}:`, { finalInput });
                return await tool.func(finalInput);
            }
        }));
        log.debug('🤖 Creating agent with tools', {
            toolNames: contextualTools.map(t => t.name),
            systemPromptLength: systemPrompt.length
        });
        const contextualAgent = (0, prebuilt_1.createReactAgent)({
            llm,
            tools: contextualTools,
            messageModifier: systemPrompt
        });
        log.debug('🔧 System prompt:', { prompt: systemPrompt });
        log.debug('🚀 Invoking agent', { messageLength: message.length });
        const startTime = Date.now();
        const result = await contextualAgent.invoke({
            messages: [new messages_1.HumanMessage(message)]
        });
        const duration = Date.now() - startTime;
        log.debug('✅ Agent completed', {
            duration: `${duration}ms`,
            messageCount: result.messages.length,
            messageTypes: result.messages.map(m => m.constructor.name)
        });
        // Log all messages for debugging
        result.messages.forEach((msg, i) => {
            log.debug(`📝 Message ${i}:`, {
                type: msg.constructor.name,
                content: msg.content.toString().substring(0, 200) + '...',
                hasToolCalls: 'tool_calls' in msg ? msg.tool_calls?.length || 0 : 0
            });
        });
        const lastMessage = result.messages[result.messages.length - 1];
        res.json({
            response: lastMessage.content.toString(),
            threadId: `thread_${Date.now()}`
        });
    }
    catch (error) {
        log.error('Chat failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});
// Legacy generation endpoints (for backward compatibility)
app.post('/generate-objectives', async (req, res) => {
    const { missionId, brief } = req.body;
    try {
        const result = await generateObjectivesTool.func(JSON.stringify({ missionId, brief }));
        res.json({ success: true, message: result });
    }
    catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
});
app.post('/generate-requirements', async (req, res) => {
    const { missionId, objectives } = req.body;
    try {
        const result = await generateRequirementsTool.func(JSON.stringify({ missionId, objectives }));
        res.json({ success: true, message: result });
    }
    catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
});
app.post('/generate-constraints', async (req, res) => {
    const { missionId, objectives, requirements } = req.body;
    try {
        const result = await generateConstraintsTool.func(JSON.stringify({ missionId, objectives, requirements }));
        res.json({ success: true, message: result });
    }
    catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
});
app.post('/generate-design-solutions', async (req, res) => {
    const { missionId, objectives, requirements, constraints } = req.body;
    try {
        const result = await generateSolutionsTool.func(JSON.stringify({ missionId, objectives, requirements, constraints }));
        res.json({ success: true, message: result });
    }
    catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
});
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    log.info(`LangGraph agent server running on port ${PORT}`);
});
//# sourceMappingURL=agent.js.map