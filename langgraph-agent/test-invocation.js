const { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } = require('@aws-sdk/client-bedrock-agentcore');

async function testAgentInvocation() {
  const inputText = "Generate a baseline mission design for a forest monitoring satellite";
  const client = new BedrockAgentCoreClient({ region: 'eu-central-1' });
  
  const input = {
    runtimeSessionId: "test-session-12345678901234567890123456789012345", // Must be 33+ chars
    agentRuntimeArn: "arn:aws:bedrock-agentcore:eu-central-1:886732474028:runtime/phase0_agent-kpLtDhGVlC",
    payload: JSON.stringify({ query: inputText })
  };

  try {
    const command = new InvokeAgentRuntimeCommand(input);
    const response = await client.send(command);
    const textResponse = await response.response.transformToString();
    
    console.log('Agent invocation successful!');
    console.log('Response:', textResponse);
  } catch (error) {
    console.error('Failed to invoke agent:', error);
  }
}

testAgentInvocation();