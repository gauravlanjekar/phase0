// Telemetry now handled by AWS Distro auto-instrumentation
// import './telemetry';
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';

import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { allTools } from './tools';



// LLM setup
const llm = new ChatOpenAI({
  modelName: 'gpt-5-mini',
  temperature: 1,
  openAIApiKey: process.env.OPENAI_API_KEY
});





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

CONSTELLATION DESIGN:
- Use multiple spacecraft when mission requires frequent revisit (<1 day), global coverage, or redundancy
- Consider constellation trade-offs: cost vs performance, complexity vs capability
- Typical constellation sizes: 3-12 spacecraft for Earth observation
- Each spacecraft in constellation can have identical or specialized payloads
- Design solutions support multiple spacecraft via spacecraft[] array

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

VALIDATION FORMULAS:
When creating requirements with validation formulas, use JSON paths for variables:
- Example paths: "designSolutions[0].spacecraft[0].components[0].mass", "designSolutions[0].orbit.altitude"
- Include proper units: "kg", "W", "m", "degrees", "minutes"
- Use mathematical expressions: "totalMass <= 500", "gsd <= 1.0", "power >= 2000"

When users ask to generate content, use the appropriate tools to actually create and save it.
When users want to modify existing solutions, use granular editing tools for precise updates.
When users ask about current information, recent missions, or specific components, use internet search to get up-to-date data.
Always get mission data first to understand the current state before making recommendations.

CONSTELLATION CONSIDERATIONS:
- For missions requiring daily revisit or better: recommend 3+ spacecraft constellation
- For global disaster monitoring: recommend 6-12 spacecraft constellation
- For high-resolution imaging with wide coverage: recommend 4-8 spacecraft constellation
- Each spacecraft in constellation should be included in the spacecraft[] array of the design solution
- Consider constellation phasing and orbital plane distribution for optimal coverage`;

// Create tool node and bind tools to model
const toolNode = new ToolNode(allTools);
const model = llm.bindTools(allTools);

// Define the function that determines whether to continue or not
function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  
  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}

// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State) {
  const systemMessage = { role: 'system' as const, content: systemPrompt };
  const response = await model.invoke([systemMessage, ...state.messages]);
  
  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

// Create StateGraph
let cachedGraph: any = null;

function getAgent() {
  if (!cachedGraph) {
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", callModel)
      .addEdge("__start__", "agent")
      .addNode("tools", toolNode)
      .addEdge("tools", "agent")
      .addConditionalEdges("agent", shouldContinue);
    
    cachedGraph = workflow.compile();
  }
  return cachedGraph;
}

// Agent Core Memory integration
import { HybridMemoryManager } from './agent-core-memory';

// Initialize hybrid memory manager
const memoryManager = new HybridMemoryManager(
  process.env.AGENT_CORE_MEMORY_ID || 'mission-design-memory'
);

// Local conversation memory for fallback
const conversationMemory = new Map<string, any[]>();
export { conversationMemory, memoryManager };

// Express server
const app = express();
app.use(cors());
app.use(express.json());

// GET /ping for Agent Core compatibility
app.get('/ping', (req, res) => {
  res.json({
    status: 'healthy',
    time_of_last_update: Math.floor(Date.now() / 1000)
  });
});

// Helper function for concise progress messages
function getProgressMessage(toolName: string): string {
  const messages: Record<string, string> = {
    'get_mission_data': '📋 Loading mission data...',
    'save_objectives': '🎯 Saving objectives...',
    'save_requirements': '📝 Saving requirements...',
    'save_constraints': '🔒 Saving constraints...',
    'save_solutions': '🚀 Saving design solutions...',
    'save_validation_reports': '✅ Saving validation results...',
    'get_objectives_schema': '🎯 Analyzing objectives...',
    'get_requirements_schema': '📝 Analyzing requirements...',
    'get_constraints_schema': '🔒 Analyzing constraints...',
    'get_solutions_schema': '🚀 Analyzing solutions...',
    'flight_dynamics_tool': '🛰️ Computing orbital mechanics...',
    'bulk_save_mission_data': '💾 Bulk saving mission data...'
  };
  return messages[toolName] || `⚙️ Running ${toolName}...`;
}

// Agent Core invocations endpoint
app.post('/invocations', async (req: Request, res: Response) => {
  console.log('📥 Invocation request received:', req.body);
  const toolName = req.body.toolName;
  if (toolName) {
    res.json({
      status: 'running',
      message: getProgressMessage(toolName)
    });
  }
  try {
    const hasInputFormat = 'input' in req.body && req.body.input?.prompt;
    const message = hasInputFormat ? req.body.input.prompt : req.body.inputText;
    const sessionId = req.body.sessionId;
    
    if (!sessionId) {
      return res.status(500).json({ error: 'sessionId is required' });
    }
    
    const conversationHistory = await memoryManager.getConversation(sessionId);
    const userMessage = new HumanMessage(message);
    const allMessages = [...conversationHistory, userMessage];
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    const agent = getAgent();
    let finalResult;
    
    for await (const chunk of await agent.stream(
      { messages: allMessages },
      { streamMode: "updates" }
    )) {
      const nodeNames = Object.keys(chunk);
      for (const nodeName of nodeNames) {
        if (chunk[nodeName]) {
          finalResult = chunk[nodeName];
        }
      }
    }
    
    const lastMessage = finalResult.messages[finalResult.messages.length - 1];
    const updatedHistory = finalResult.messages.slice(-20);
    
    res.write(`data: ${JSON.stringify({
      completion: lastMessage.content,
      sessionId: sessionId,
      sessionState: req.body.sessionState,
      conversationHistory: updatedHistory.map((msg: any) => ({
        text: msg.content?.toString() || '',
        isUser: msg.constructor.name === 'HumanMessage',
        timestamp: new Date().toISOString()
      }))
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    await memoryManager.storeConversation(sessionId, updatedHistory);
    conversationMemory.set(sessionId, updatedHistory);
    
    res.end();
  } catch (error) {
    console.error('❌ Chat failed:', (error as Error).message);
    console.error('❌ Full error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});





const PORT = parseInt(process.env.PORT || '8080');
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`LangGraph agent server running on ${HOST}:${PORT}`);
  console.log(`/invocations endpoint configured for Agent Core format`);
  console.log(`AWS Distro for OpenTelemetry (ADOT) tracing enabled`);
});