const { BedrockAgentCoreControlClient, UpdateAgentRuntimeCommand, ListAgentRuntimeVersionsCommand } = require('@aws-sdk/client-bedrock-agentcore-control');

async function deployAgent() {
  const client = new BedrockAgentCoreControlClient({ region: 'eu-central-1' });
  const agentRuntimeId = 'phase0_agent-kpLtDhGVlC';
  const containerUri = '886732474028.dkr.ecr.eu-central-1.amazonaws.com/phase0-agent:latest';

  try {
    // Update runtime (this creates a new version automatically)
    const command = new UpdateAgentRuntimeCommand({
      agentRuntimeId,
      agentRuntimeArtifact: {
        containerConfiguration: { containerUri }
      },
      networkConfiguration: { networkMode: 'PUBLIC' },
      roleArn: 'arn:aws:iam::886732474028:role/phase0_agent_runtime'
    });

    const response = await client.send(command);
    console.log('Agent Runtime updated successfully!');
    console.log(`Agent Runtime ARN: ${response.agentRuntimeArn}`);
    console.log(`Status: ${response.status}`);

    // List versions to show the new version
    const listVersionsCommand = new ListAgentRuntimeVersionsCommand({
      agentRuntimeId
    });
    
    const versionsResponse = await client.send(listVersionsCommand);
    console.log('Available versions:');
    versionsResponse.agentRuntimeVersionSummaries?.forEach(version => {
      console.log(`  Version: ${version.version}, Status: ${version.status}, Created: ${version.creationTime}`);
    });

  } catch (error) {
    console.error('Failed to update agent runtime:', error);
  }
}

deployAgent();