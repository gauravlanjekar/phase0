const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const MISSIONS_TABLE = process.env.MISSIONS_TABLE;
const MISSION_DATA_TABLE = process.env.MISSION_DATA_TABLE;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
};

exports.handler = async (event) => {
  const { httpMethod, pathParameters, body, resource } = event;

  try {
    switch (resource) {
      case '/missions':
        if (httpMethod === 'GET') return await getMissions();
        if (httpMethod === 'POST') return await createMission(JSON.parse(body));
        break;
      
      case '/missions/{id}':
        if (httpMethod === 'DELETE') return await deleteMission(pathParameters.id);
        break;
      
      case '/missions/{id}/tabs/{tabIndex}':
        if (httpMethod === 'GET') return await getTabData(pathParameters.id, pathParameters.tabIndex);
        if (httpMethod === 'PUT') return await saveTabData(pathParameters.id, pathParameters.tabIndex, JSON.parse(body));
        break;
      
      case '/missions/{id}/chat':
        if (httpMethod === 'POST') return await sendChat(JSON.parse(body));
        break;
    }
    
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

async function getMissions() {
  const result = await dynamodb.scan({ TableName: MISSIONS_TABLE }).promise();
  return { statusCode: 200, headers, body: JSON.stringify(result.Items) };
}

async function createMission({ brief }) {
  const mission = {
    id: uuidv4(),
    brief,
    createdAt: new Date().toISOString()
  };
  
  await dynamodb.put({ TableName: MISSIONS_TABLE, Item: mission }).promise();
  return { statusCode: 201, headers, body: JSON.stringify(mission) };
}

async function deleteMission(id) {
  await dynamodb.delete({ TableName: MISSIONS_TABLE, Key: { id } }).promise();
  return { statusCode: 204, headers, body: '' };
}

async function getTabData(missionId, tabIndex) {
  try {
    const result = await dynamodb.get({
      TableName: MISSION_DATA_TABLE,
      Key: { missionId, tabIndex }
    }).promise();
    
    const data = result.Item || { notes: '', status: 'Not Started' };
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 200, headers, body: JSON.stringify({ notes: '', status: 'Not Started' }) };
  }
}

async function saveTabData(missionId, tabIndex, { notes, status }) {
  const item = { missionId, tabIndex, notes, status };
  await dynamodb.put({ TableName: MISSION_DATA_TABLE, Item: item }).promise();
  return { statusCode: 200, headers, body: JSON.stringify(item) };
}

async function sendChat({ message }) {
  const response = `I understand your request about: "${message}". How can I help you further with this mission?`;
  return { statusCode: 200, headers, body: JSON.stringify({ response }) };
}