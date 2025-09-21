import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { missionAPI } from '../services/api';

const MISSION_TABS = [
  'Mission Objectives & Stakeholder Needs',
  'Mission Requirements',
  'Orbit Selection',
  'Payload Definition',
  'Spacecraft Bus & Subsystems',
  'Ground Segment & Data System',
  'Trade Studies & Early Costing',
  'Concept of Operations (ConOps)',
  'Mission Concept Review (MCR)'
];

function MissionWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Welcome to Mission ' + id + ' workspace. How can I assist you?', sender: 'agent' }
  ]);
  const [tabData, setTabData] = useState({ notes: '', status: 'Not Started' });

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    try {
      const data = await missionAPI.getTabData(id, activeTab);
      setTabData(data);
    } catch (error) {
      console.error('Failed to load tab data:', error);
    }
  };
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const userMessage = { id: Date.now(), text: newMessage, sender: 'user' };
      setMessages(prev => [...prev, userMessage]);
      
      try {
        const { response } = await missionAPI.sendChatMessage(id, newMessage);
        const agentResponse = { id: Date.now() + 1, text: response, sender: 'agent' };
        setMessages(prev => [...prev, agentResponse]);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
      
      setNewMessage('');
    }
  };

  const saveTabData = async () => {
    try {
      await missionAPI.saveTabData(id, activeTab, tabData);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Failed to save tab data:', error);
    }
  };

  return (
    <div className="workspace">
      <div className="chat-section">
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)'
        }}>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h3 style={{ margin: '0.5rem 0 0 0', fontWeight: '600' }}>Mission {id} Chat</h3>
        </div>
        
        <div className="chat-messages">
          {messages.map(message => (
            <div key={message.id} style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              background: message.sender === 'user' 
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3))' 
                : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              marginLeft: message.sender === 'user' ? '2rem' : '0',
              marginRight: message.sender === 'agent' ? '2rem' : '0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <strong>{message.sender === 'user' ? 'You' : 'Agent'}:</strong> {message.text}
            </div>
          ))}
        </div>
        
        <form className="chat-input" onSubmit={sendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            style={{ 
              width: '70%', 
              marginRight: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              color: '#ffffff'
            }}
          />
          <button type="submit" className="btn btn-primary">Send</button>
        </form>
      </div>

      <div className="tabs-section">
        <div className="tabs-nav">
          {MISSION_TABS.map((tab, index) => (
            <button
              key={index}
              className={`tab-button ${activeTab === index ? 'active' : ''}`}
              onClick={() => setActiveTab(index)}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="tab-content">
          <h2 style={{ 
            fontSize: '1.8rem', 
            fontWeight: '600', 
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>{MISSION_TABS[activeTab]}</h2>
          <div className="form-group">
            <label>Notes</label>
            <textarea 
              value={tabData.notes}
              onChange={(e) => setTabData({...tabData, notes: e.target.value})}
              placeholder={`Enter details for ${MISSION_TABS[activeTab]}...`} 
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select 
              value={tabData.status}
              onChange={(e) => setTabData({...tabData, status: e.target.value})}
            >
              <option>Not Started</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={saveTabData}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default MissionWorkspace;