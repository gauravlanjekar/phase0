const { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } = require('@aws-sdk/client-bedrock-agentcore');

async function testAgentInvocation() {
  try {
    const inputText = "Generate a baseline mission design for a forest monitoring satellite";
    const client = new BedrockAgentCoreClient({ region: "eu-central-1" });
    
    const jsonPayload = {
      "input": { "prompt": inputText },
      "sessionId": "dfmeoagmreaklgmrkleafremoigrmtesogmtrskhmtkrlshmt"
    };
    
    const input = {
      runtimeSessionId: "dfmeoagmreaklgmrkleafremoigrmtesogmtrskhmtkrlshmt",
      agentRuntimeArn: "arn:aws:bedrock-agentcore:eu-central-1:886732474028:runtime/phase0_agent-kpLtDhGVlC",
      qualifier: "DEFAULT",
      contentType: "application/json",
      payload: new TextEncoder().encode(JSON.stringify(jsonPayload))
    };

    console.log('Sending payload:', jsonPayload);
    console.log('Payload length:', jsonPayload.length);
    console.log('Encoded payload length:', new TextEncoder().encode(jsonPayload).length);
    console.log('Full input object:', JSON.stringify(input, null, 2));
    
    const command = new InvokeAgentRuntimeCommand(input);
    const response = await client.send(command);

    console.log('Response received:', response.$metadata);
    const textResponse = await response.response.transformToString();
    
    console.log('Agent invocation successful!');
    console.log('Response:', textResponse);
  } catch (error) {
    console.error('Failed to invoke agent:', error);
  }
}

testAgentInvocation();