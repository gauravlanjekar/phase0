const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
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
        if (httpMethod === 'GET') return await getMission(pathParameters.id);
        if (httpMethod === 'PUT') return await updateMission(pathParameters.id, JSON.parse(body));
        if (httpMethod === 'DELETE') return await deleteMission(pathParameters.id);
        break;
      
      case '/missions/{id}/tabs/{tabIndex}':
        if (httpMethod === 'GET') return await getTabData(pathParameters.id, pathParameters.tabIndex);
        if (httpMethod === 'PUT') return await saveTabData(pathParameters.id, pathParameters.tabIndex, JSON.parse(body));
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
  const mission = {
    id: uuidv4(),
    name: `Mission ${uuidv4().slice(0, 8)}`,
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
    
    // Initialize objectives for tab 0 (Mission Objectives)
    if (tabIndex === '0' && !data.objectives) {
      data.objectives = [
        { id: 'obj1', text: '' },
        { id: 'obj2', text: '' },
        { id: 'obj3', text: '' }
      ];
    }
    
    // Initialize requirements for tab 1 (Mission Requirements)
    if (tabIndex === '1' && !data.requirements) {
      data.requirements = createDefaultRequirements();
    }
    
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (error) {
    const defaultData = { notes: '', status: 'Not Started' };
    if (tabIndex === '0') {
      defaultData.objectives = [
        { id: 'obj1', text: '' },
        { id: 'obj2', text: '' },
        { id: 'obj3', text: '' }
      ];
    }
    if (tabIndex === '1') {
      defaultData.requirements = createDefaultRequirements();
    }
    return { statusCode: 200, headers, body: JSON.stringify(defaultData) };
  }
}

async function saveTabData(missionId, tabIndex, data) {
  const item = { missionId, tabIndex, ...data };
  await dynamodb.send(new PutCommand({ TableName: MISSION_DATA_TABLE, Item: item }));
  return { statusCode: 200, headers, body: JSON.stringify(item) };
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