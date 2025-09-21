import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { missionAPI } from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const data = await missionAPI.getMissions();
      setMissions(data);
    } catch (error) {
      console.error('Failed to load missions:', error);
    } finally {
      setLoading(false);
    }
  };
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMissionBrief, setNewMissionBrief] = useState('');

  const createMission = async (e) => {
    e.preventDefault();
    if (newMissionBrief.trim()) {
      try {
        const newMission = await missionAPI.createMission(newMissionBrief.trim());
        setMissions([...missions, newMission]);
        setNewMissionBrief('');
        setShowCreateForm(false);
      } catch (error) {
        console.error('Failed to create mission:', error);
      }
    }
  };

  const deleteMission = async (id) => {
    try {
      await missionAPI.deleteMission(id);
      setMissions(missions.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete mission:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>Mission Admin Dashboard</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create New Mission'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={createMission} style={{ 
          marginBottom: '2rem', 
          padding: '2rem', 
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '16px' 
        }}>
          <div className="form-group">
            <label>Mission Brief</label>
            <textarea
              value={newMissionBrief}
              onChange={(e) => setNewMissionBrief(e.target.value)}
              placeholder="Enter mission brief..."
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Create Mission</button>
        </form>
      )}

      {loading ? (
        <div>Loading missions...</div>
      ) : (
        <div className="missions-grid">
          {missions.map(mission => (
          <div key={mission.id} className="mission-card">
            <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '0.5rem' }}>Mission {mission.id}</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.5', marginBottom: '1.5rem' }}>{mission.brief}</p>
            <div style={{ marginTop: '1rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate(`/mission/${mission.id}`)}
              >
                Open Mission
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => deleteMission(mission.id)}
              >
                Delete
              </button>
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;