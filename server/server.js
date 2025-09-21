const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// In-memory storage
let missions = [
  { id: '1', brief: 'Mars Exploration Mission', createdAt: new Date().toISOString() },
  { id: '2', brief: 'Lunar Base Establishment', createdAt: new Date().toISOString() }
];

let missionData = {};

// Mission CRUD endpoints
app.get('/api/missions', (req, res) => {
  res.json(missions);
});

app.post('/api/missions', (req, res) => {
  const { brief } = req.body;
  const mission = {
    id: uuidv4(),
    brief,
    createdAt: new Date().toISOString()
  };
  missions.push(mission);
  missionData[mission.id] = { tabs: {} };
  res.status(201).json(mission);
});

app.delete('/api/missions/:id', (req, res) => {
  const { id } = req.params;
  missions = missions.filter(m => m.id !== id);
  delete missionData[id];
  res.status(204).send();
});

// Mission tab data endpoints
app.get('/api/missions/:id/tabs/:tabIndex', (req, res) => {
  const { id, tabIndex } = req.params;
  let data = missionData[id]?.tabs[tabIndex] || { notes: '', status: 'Not Started' };
  
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
  
  res.json(data);
});

app.put('/api/missions/:id/tabs/:tabIndex', (req, res) => {
  const { id, tabIndex } = req.params;
  const data = req.body;
  
  if (!missionData[id]) {
    missionData[id] = { tabs: {} };
  }
  
  missionData[id].tabs[tabIndex] = data;
  res.json(missionData[id].tabs[tabIndex]);
});

// Chat endpoints
app.post('/api/missions/:id/chat', (req, res) => {
  const { message } = req.body;
  const response = `I understand your request about: "${message}". How can I help you further with this mission?`;
  res.json({ response });
});

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});