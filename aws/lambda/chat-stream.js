const { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } = require('@aws-sdk/client-bedrock-agentcore');

const agentCoreClient = new BedrockAgentCoreClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const AGENT_RUNTIME_ARN = process.env.AGENT_RUNTIME_ARN;

exports.handler = async (event, context) => {
  const { pathParameters, body } = event;
  const { message, threadId } = JSON.parse(body);
  const missionId = pathParameters.id;
  
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

    const response = await agentCoreClient.send(command);
    
    // Return streaming response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
      },
      body: await response.response.transformToString(),
      isBase64Encoded: false
    };
  } catch (error) {
    console.error('Streaming chat failed:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to communicate with agent',
        details: error.message 
      })
    };
  }
};