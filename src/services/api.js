const API_BASE = 'http://localhost:3001/api';

export const missionAPI = {
  // Get all missions
  getMissions: async () => {
    const response = await fetch(`${API_BASE}/missions`);
    return response.json();
  },

  // Create new mission
  createMission: async (brief) => {
    const response = await fetch(`${API_BASE}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief })
    });
    return response.json();
  },

  // Delete mission
  deleteMission: async (id) => {
    await fetch(`${API_BASE}/missions/${id}`, {
      method: 'DELETE'
    });
  },

  // Get tab data
  getTabData: async (missionId, tabIndex) => {
    const response = await fetch(`${API_BASE}/missions/${missionId}/tabs/${tabIndex}`);
    return response.json();
  },

  // Save tab data
  saveTabData: async (missionId, tabIndex, data) => {
    const response = await fetch(`${API_BASE}/missions/${missionId}/tabs/${tabIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Send chat message
  sendChatMessage: async (missionId, message) => {
    const response = await fetch(`${API_BASE}/missions/${missionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return response.json();
  }
};