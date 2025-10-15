const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } = require('@aws-sdk/client-bedrock-agentcore');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const agentCoreClient = new BedrockAgentCoreClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const MISSIONS_TABLE = process.env.MISSIONS_TABLE;
const MISSION_DATA_TABLE = process.env.MISSION_DATA_TABLE;
const AGENT_RUNTIME_ARN = process.env.AGENT_RUNTIME_ARN;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
};

exports.handler = async (event) => {
  const { httpMethod, body, path } = event;
  
  // Extract path parameters from ALB path
  const pathParams = {};
  let routePattern = path;
  
  // Match /missions/{id}
  const missionIdMatch = path.match(/^\/missions\/([^/]+)$/);
  if (missionIdMatch) {
    pathParams.id = missionIdMatch[1];
    routePattern = '/missions/{id}';
  }
  
  // Match /missions/{id}/tabs/{tabIndex}
  const tabMatch = path.match(/^\/missions\/([^/]+)\/tabs\/([^/]+)$/);
  if (tabMatch) {
    pathParams.id = tabMatch[1];
    pathParams.tabIndex = tabMatch[2];
    routePattern = '/missions/{id}/tabs/{tabIndex}';
  }
  

  
  // Match /missions/{id}/chat/stream (check this before /missions/{id}/chat)
  const chatStreamMatch = path.match(/^\/missions\/([^/]+)\/chat\/stream$/);
  if (chatStreamMatch) {
    pathParams.id = chatStreamMatch[1];
    routePattern = '/missions/{id}/chat/stream';
  }
  // Match /missions/{id}/chat (after checking stream)
  else if (path.match(/^\/missions\/([^/]+)\/chat$/)) {
    const chatMatch = path.match(/^\/missions\/([^/]+)\/chat$/);
    pathParams.id = chatMatch[1];
    routePattern = '/missions/{id}/chat';
  }
  
  // Handle OPTIONS preflight requests
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
      },
      body: ''
    };
  }

  try {
    switch (routePattern) {
      case '/missions':
        if (httpMethod === 'GET') return await getMissions();
        if (httpMethod === 'POST') return await createMission(JSON.parse(body));
        break;
      
      case '/missions/{id}':
        if (httpMethod === 'GET') return await getMission(pathParams.id);
        if (httpMethod === 'PUT') return await updateMission(pathParams.id, JSON.parse(body));
        if (httpMethod === 'DELETE') return await deleteMission(pathParams.id);
        break;
      
      case '/missions/{id}/tabs/{tabIndex}':
        if (httpMethod === 'GET') return await getTabData(pathParams.id, pathParams.tabIndex);
        if (httpMethod === 'PUT') return await saveTabData(pathParams.id, pathParams.tabIndex, JSON.parse(body));
        break;
      
      case '/missions/{id}/chat':
        if (httpMethod === 'POST') return await chatWithAgent(pathParams.id, JSON.parse(body), false);
        break;
      
      case '/missions/{id}/chat/stream':
        if (httpMethod === 'POST') return await chatWithAgent(pathParams.id, JSON.parse(body), true);
        break;

    }
    
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

async function getMissions() {
  const result = await dynamodb.send(new ScanCommand({ TableName: MISSIONS_TABLE }));
  return { statusCode: 200, headers, body: JSON.stringify(result.Items) };
}

async function createMission({ brief }) {
  // Generate mission name from brief
  const keywords = brief.toLowerCase().match(/\b(earth|observation|monitoring|imaging|satellite|climate|agriculture|disaster|forest|urban|ocean|weather)\b/g) || [];
  const uniqueKeywords = [...new Set(keywords)];
  const generatedName = `${uniqueKeywords[0] || 'earth'}-obs-${Date.now().toString().slice(-4)}`.toUpperCase().replace(/-/g, '_');
  
  const mission = {
    id: uuidv4(),
    name: generatedName,
    brief,
    createdAt: new Date().toISOString()
  };
  
  await dynamodb.send(new PutCommand({ TableName: MISSIONS_TABLE, Item: mission }));
  return { statusCode: 201, headers, body: JSON.stringify(mission) };
}

async function getMission(id) {
  const result = await dynamodb.send(new GetCommand({ TableName: MISSIONS_TABLE, Key: { id } }));
  if (!result.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Mission not found' }) };
  }
  return { statusCode: 200, headers, body: JSON.stringify(result.Item) };
}

async function updateMission(id, { name }) {
  const result = await dynamodb.send(new GetCommand({ TableName: MISSIONS_TABLE, Key: { id } }));
  if (!result.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Mission not found' }) };
  }
  
  const updatedMission = { ...result.Item, name, updatedAt: new Date().toISOString() };
  await dynamodb.send(new PutCommand({ TableName: MISSIONS_TABLE, Item: updatedMission }));
  return { statusCode: 200, headers, body: JSON.stringify(updatedMission) };
}

async function deleteMission(id) {
  await dynamodb.send(new DeleteCommand({ TableName: MISSIONS_TABLE, Key: { id } }));
  return { statusCode: 204, headers, body: '' };
}

async function getTabData(missionId, tabIndex) {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: MISSION_DATA_TABLE,
      Key: { missionId, tabIndex }
    }));
    
    let data = result.Item || { notes: '', status: 'Not Started' };
    
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (error) {
    const defaultData = { notes: '', status: 'Not Started' };
    return { statusCode: 200, headers, body: JSON.stringify(defaultData) };
  }
}

async function saveTabData(missionId, tabIndex, data) {
  const item = { missionId, tabIndex, ...data };
  await dynamodb.send(new PutCommand({ TableName: MISSION_DATA_TABLE, Item: item }));
  return { statusCode: 200, headers, body: JSON.stringify(item) };
}



async function chatWithAgent(missionId, { message, threadId }, isStreaming = false) {
  try {
    const sessionId = threadId || `mission_${missionId}`;
    const fullMessage = `Working with Mission ID: ${missionId}. Use this ID when calling tools that require missionId parameter.\n\n${message}`;
    
    const payload = JSON.stringify({
      input: { prompt: fullMessage },
      sessionId: sessionId
    });
    
    const command = new InvokeAgentRuntimeCommand({
      runtimeSessionId: sessionId,
      agentRuntimeArn: AGENT_RUNTIME_ARN,
      qualifier: "DEFAULT",
      contentType: "application/json",
      payload: new TextEncoder().encode(payload)
    });
    
    console.log('Invoking agent with:', { 
      sessionId, 
      missionId, 
      messageLength: fullMessage.length,
      agentRuntimeArn: AGENT_RUNTIME_ARN,
      streaming: isStreaming
    });

    const response = await agentCoreClient.send(command);
    console.log('Agent response received:', {
      statusCode: response.$metadata?.httpStatusCode,
      requestId: response.$metadata?.requestId
    });
    
    const textResponse = await response.response.transformToString();
    
    if (isStreaming) {
      // Return raw SSE stream for streaming endpoints
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
        },
        body: textResponse,
        isBase64Encoded: false
      };
    }
    
    // Parse SSE response for non-streaming endpoints
    const lines = textResponse.split('\n');
    let completion = '';
    let conversationHistory = [];
    
    for (const line of lines) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.completion) {
            completion = data.completion;
          }
          if (data.conversationHistory) {
            conversationHistory = data.conversationHistory;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: completion,
        threadId: sessionId,
        conversationHistory: conversationHistory
      })
    };
  } catch (error) {
    console.error('Agent invocation failed:', {
      message: error.message,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      stack: error.stack
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to communicate with agent',
        details: error.message,
        code: error.code
      })
    };
  }
}

function createDefaultRequirements() {
  const categories = [
    'Orbit Selection',
    'Payload Definition', 
    'Spacecraft Bus & Subsystems',
    'Ground Segment & Data System',
    'Trade Studies & Early Costing',
    'Concept of Operations (ConOps)',
    'Mission Concept Review (MCR)'
  ];
  
  const requirements = [];
  categories.forEach((category, catIndex) => {
    for (let i = 1; i <= 8; i++) {
      requirements.push({
        id: `req_${catIndex + 1}_${i}`,
        description: '',
        unit: '',
        met: false,
        comment: '',
        linkedObjective: '',
        category
      });
    }
  });
  return requirements;
}