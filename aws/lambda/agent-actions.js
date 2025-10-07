const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const MISSIONS_TABLE = process.env.MISSIONS_TABLE;
const MISSION_DATA_TABLE = process.env.MISSION_DATA_TABLE;

exports.handler = async (event) => {
  console.log('Agent action event:', JSON.stringify(event, null, 2));
  
  const { actionGroup, apiPath, httpMethod, parameters, requestBody } = event;
  
  try {
    switch (apiPath) {
      case '/mission/{missionId}/objectives':
        if (httpMethod === 'GET') return await getMissionObjectives(parameters.missionId);
        if (httpMethod === 'PUT') return await saveMissionObjectives(parameters.missionId, requestBody);
        break;
      
      case '/mission/{missionId}/requirements':
        if (httpMethod === 'GET') return await getMissionRequirements(parameters.missionId);
        if (httpMethod === 'PUT') return await saveMissionRequirements(parameters.missionId, requestBody);
        break;
      
      case '/mission/{missionId}/status':
        return await getMissionStatus(parameters.missionId);
      
      default:
        return {
          messageVersion: '1.0',
          response: {
            actionGroup: actionGroup,
            apiPath: apiPath,
            httpMethod: httpMethod,
            httpStatusCode: 404,
            responseBody: {
              'application/json': {
                body: JSON.stringify({ error: 'Action not found' })
              }
            }
          }
        };
    }
  } catch (error) {
    console.error('Agent action error:', error);
    return {
      messageVersion: '1.0',
      response: {
        actionGroup: actionGroup,
        apiPath: apiPath,
        httpMethod: httpMethod,
        httpStatusCode: 500,
        responseBody: {
          'application/json': {
            body: JSON.stringify({ error: error.message })
          }
        }
      }
    };
  }
};

async function getMissionObjectives(missionId) {
  const result = await dynamodb.send(new GetCommand({
    TableName: MISSION_DATA_TABLE,
    Key: { missionId, tabIndex: '0' }
  }));
  
  const objectives = result.Item?.objectives || [];
  
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: 'MissionActions',
      apiPath: '/mission/{missionId}/objectives',
      httpMethod: 'GET',
      httpStatusCode: 200,
      responseBody: {
        'application/json': {
          body: JSON.stringify({ objectives })
        }
      }
    }
  };
}

async function getMissionRequirements(missionId) {
  const result = await dynamodb.send(new GetCommand({
    TableName: MISSION_DATA_TABLE,
    Key: { missionId, tabIndex: '1' }
  }));
  
  const requirements = result.Item?.requirements || [];
  
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: 'MissionActions',
      apiPath: '/mission/{missionId}/requirements',
      httpMethod: 'GET',
      httpStatusCode: 200,
      responseBody: {
        'application/json': {
          body: JSON.stringify({ requirements })
        }
      }
    }
  };
}

async function saveMissionObjectives(missionId, requestBody) {
  const { objectives } = JSON.parse(requestBody.content['application/json'].body);
  
  await dynamodb.send(new PutCommand({
    TableName: MISSION_DATA_TABLE,
    Item: { missionId, tabIndex: '0', objectives }
  }));
  
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: 'MissionActions',
      apiPath: '/mission/{missionId}/objectives',
      httpMethod: 'PUT',
      httpStatusCode: 200,
      responseBody: {
        'application/json': {
          body: JSON.stringify({ success: true })
        }
      }
    }
  };
}

async function saveMissionRequirements(missionId, requestBody) {
  const { requirements } = JSON.parse(requestBody.content['application/json'].body);
  
  await dynamodb.send(new PutCommand({
    TableName: MISSION_DATA_TABLE,
    Item: { missionId, tabIndex: '1', requirements }
  }));
  
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: 'MissionActions',
      apiPath: '/mission/{missionId}/requirements',
      httpMethod: 'PUT',
      httpStatusCode: 200,
      responseBody: {
        'application/json': {
          body: JSON.stringify({ success: true })
        }
      }
    }
  };
}

async function getMissionStatus(missionId) {
  // Get mission info
  const mission = await dynamodb.send(new GetCommand({
    TableName: MISSIONS_TABLE,
    Key: { id: missionId }
  }));
  
  // Get objectives
  const objectives = await dynamodb.send(new GetCommand({
    TableName: MISSION_DATA_TABLE,
    Key: { missionId, tabIndex: '0' }
  }));
  
  // Get requirements
  const requirements = await dynamodb.send(new GetCommand({
    TableName: MISSION_DATA_TABLE,
    Key: { missionId, tabIndex: '1' }
  }));
  
  const status = {
    mission: mission.Item?.brief || 'No brief available',
    objectives: {
      total: objectives.Item?.objectives?.length || 0,
      completed: objectives.Item?.objectives?.filter(obj => obj.text).length || 0
    },
    requirements: {
      total: requirements.Item?.requirements?.length || 0,
      completed: requirements.Item?.requirements?.filter(req => req.met).length || 0,
      byCategory: {}
    }
  };
  
  // Group requirements by category
  if (requirements.Item?.requirements) {
    requirements.Item.requirements.forEach(req => {
      if (!status.requirements.byCategory[req.category]) {
        status.requirements.byCategory[req.category] = { total: 0, completed: 0 };
      }
      status.requirements.byCategory[req.category].total++;
      if (req.met) {
        status.requirements.byCategory[req.category].completed++;
      }
    });
  }
  
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: 'MissionActions',
      apiPath: '/mission/{missionId}/status',
      httpMethod: 'GET',
      httpStatusCode: 200,
      responseBody: {
        'application/json': {
          body: JSON.stringify({ status })
        }
      }
    }
  };
}