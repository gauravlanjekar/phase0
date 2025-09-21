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

const createDefaultRequirements = () => {
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
};

const groupRequirementsByCategory = (requirements) => {
  return requirements.reduce((groups, req) => {
    const category = req.category || 'Uncategorized';
    if (!groups[category]) groups[category] = [];
    groups[category].push(req);
    return groups;
  }, {});
};

function MissionWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Welcome to Mission ' + id + ' workspace. How can I assist you?', sender: 'agent' }
  ]);
  const [tabData, setTabData] = useState({ notes: '', status: 'Not Started' });
  const [objectives, setObjectives] = useState([
    { id: 'obj1', text: '' },
    { id: 'obj2', text: '' },
    { id: 'obj3', text: '' }
  ]);
  const [requirements, setRequirements] = useState([]);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (category) => {
    setCollapsedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    try {
      const data = await missionAPI.getTabData(id, activeTab);
      setTabData(data);
      if (activeTab === 0 && data.objectives) {
        setObjectives(data.objectives);
      }
      if (activeTab === 1) {
        setRequirements(data.requirements || createDefaultRequirements());
      }
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
      let dataToSave = tabData;
      if (activeTab === 0) {
        dataToSave = { ...tabData, objectives };
      } else if (activeTab === 1) {
        dataToSave = { ...tabData, requirements };
      }
      await missionAPI.saveTabData(id, activeTab, dataToSave);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Failed to save tab data:', error);
    }
  };

  const updateObjective = (objId, text) => {
    setObjectives(prev => prev.map(obj => 
      obj.id === objId ? { ...obj, text } : obj
    ));
  };

  const updateRequirement = (reqId, field, value) => {
    setRequirements(prev => prev.map(req => 
      req.id === reqId ? { ...req, [field]: value } : req
    ));
  };

  const addRequirement = (category) => {
    const newReq = {
      id: `req_${Date.now()}`,
      description: '',
      unit: '',
      met: false,
      comment: '',
      linkedObjective: '',
      category
    };
    setRequirements(prev => [...prev, newReq]);
  };

  const removeRequirement = (reqId) => {
    setRequirements(prev => prev.filter(req => req.id !== reqId));
  };

  return (
    <div className="workspace">
      <div className="chat-section" style={{ width: chatCollapsed ? '60px' : '40%' }}>
        <div style={{ 
          padding: '1rem', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: chatCollapsed ? 'none' : 'block' }}>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              ← Back to Dashboard
            </button>
            <h3 style={{ margin: '0.5rem 0 0 0', fontWeight: '600' }}>Mission {id} Chat</h3>
          </div>
          <button 
            onClick={() => setChatCollapsed(!chatCollapsed)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: 'white',
              padding: '0.5rem',
              cursor: 'pointer'
            }}
          >
            {chatCollapsed ? '→' : '←'}
          </button>
        </div>
        
        <div className="chat-messages" style={{ display: chatCollapsed ? 'none' : 'block' }}>
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
        
        <form className="chat-input" onSubmit={sendMessage} style={{ display: chatCollapsed ? 'none' : 'block' }}>
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

      <div className="tabs-section" style={{ width: chatCollapsed ? 'calc(100% - 60px)' : '60%' }}>
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
          {activeTab === 0 ? (
            <div>
              <h3 style={{ marginBottom: '1.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>Mission Objectives</h3>
              {objectives.map((objective, index) => (
                <div key={objective.id} className="form-group">
                  <label>Objective {index + 1} (ID: {objective.id})</label>
                  <textarea
                    value={objective.text}
                    onChange={(e) => updateObjective(objective.id, e.target.value)}
                    placeholder={`Enter objective ${index + 1}...`}
                    style={{ minHeight: '80px' }}
                  />
                </div>
              ))}
            </div>
          ) : activeTab === 1 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', margin: 0 }}>Mission Requirements</h3>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {requirements.filter(r => r.met).length} / {requirements.length} completed
                </div>
              </div>
              
              <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '1rem' }}>
                {Object.entries(groupRequirementsByCategory(requirements)).map(([category, reqs]) => (
                  <div key={category} style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div 
                        onClick={() => toggleSection(category)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        <span style={{
                          color: '#667eea',
                          fontSize: '1rem',
                          transition: 'transform 0.2s ease',
                          transform: collapsedSections[category] ? 'rotate(-90deg)' : 'rotate(0deg)'
                        }}>
                          ▼
                        </span>
                        <h4 style={{ 
                          color: '#667eea', 
                          margin: 0,
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          {category}
                          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                            ({reqs.filter(r => r.met).length}/{reqs.length})
                          </span>
                        </h4>
                      </div>
                      <button
                        onClick={() => addRequirement(category)}
                        style={{
                          background: 'rgba(102, 126, 234, 0.2)',
                          border: '1px solid rgba(102, 126, 234, 0.4)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          padding: '0.5rem 1rem'
                        }}
                      >
                        + Add Requirement
                      </button>
                    </div>
                    
                    {!collapsedSections[category] && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                        {reqs.map(req => (
                        <div key={req.id} style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(10px)',
                          border: `1px solid ${req.met ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '12px',
                          padding: '1rem',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          {/* Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateRequirement(req.id, 'met', !req.met);
                                }}
                                style={{
                                  background: req.met ? '#4CAF50' : '#f44336',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {req.met ? '✓' : '✗'}
                              </button>
                              <div style={{
                                fontSize: '0.7rem',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontFamily: 'monospace'
                              }}>{req.id}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {req.comment && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPopupData({ type: 'comment', reqId: req.id, content: req.comment });
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    padding: '0.25rem'
                                  }}
                                  title="View comment"
                                >
                                  💬
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPopupData({ type: 'edit', reqId: req.id, req });
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  cursor: 'pointer',
                                  fontSize: '1rem',
                                  padding: '0.25rem'
                                }}
                                title="More options"
                              >
                                ⋮
                              </button>
                            </div>
                          </div>
                          
                          {/* Main Content */}
                          <div style={{ marginBottom: '0.5rem' }}>
                            <div 
                              contentEditable
                              suppressContentEditableWarning={true}
                              style={{
                                color: '#ffffff',
                                fontSize: '0.9rem',
                                lineHeight: '1.4',
                                outline: 'none',
                                minHeight: '1.2rem',
                                cursor: 'text',
                                padding: '0.25rem 0'
                              }}
                              onFocus={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.target.style.borderRadius = '4px';
                                e.target.style.padding = '0.5rem';
                              }}
                              onBlur={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.padding = '0.25rem 0';
                                updateRequirement(req.id, 'description', e.target.textContent);
                              }}
                            >
                              {req.description || 'Click to add requirement description...'}
                            </div>
                          </div>
                          
                          {/* Unit */}
                          {req.unit && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'rgba(255, 255, 255, 0.6)',
                              background: 'rgba(255, 255, 255, 0.1)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              display: 'inline-block',
                              marginBottom: '0.5rem'
                            }}>
                              Unit: {req.unit}
                            </div>
                          )}
                          

                          
                          {/* Objective Link Indicator */}
                          {req.linkedObjective && (
                            <div style={{
                              position: 'absolute',
                              top: '0.5rem',
                              right: '3.5rem',
                              fontSize: '0.7rem',
                              color: '#667eea',
                              background: 'rgba(102, 126, 234, 0.2)',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px'
                            }}>
                              → {req.linkedObjective}
                            </div>
                          )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Popup Modal */}
              {popupData && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000
                }} onClick={() => setPopupData(null)}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflow: 'auto'
                  }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0, color: '#ffffff' }}>
                        {popupData.type === 'comment' ? 'Comment' : `Edit Requirement ${popupData.reqId}`}
                      </h3>
                      <button
                        onClick={() => setPopupData(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.6)',
                          cursor: 'pointer',
                          fontSize: '1.5rem'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
                    {popupData.type === 'comment' ? (
                      <div style={{
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px'
                      }}>
                        {popupData.content || 'No comment available'}
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem', display: 'block' }}>Unit</label>
                          <input
                            type="text"
                            defaultValue={popupData.req.unit}
                            onBlur={(e) => updateRequirement(popupData.reqId, 'unit', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                              fontSize: '0.9rem'
                            }}
                            placeholder="Enter unit (e.g., kg, m/s, °C)"
                          />
                        </div>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem', display: 'block' }}>Comments</label>
                          <textarea
                            defaultValue={popupData.req.comment}
                            onBlur={(e) => updateRequirement(popupData.reqId, 'comment', e.target.value)}
                            style={{
                              width: '100%',
                              minHeight: '100px',
                              padding: '0.75rem',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                              fontSize: '0.9rem',
                              resize: 'vertical'
                            }}
                            placeholder="Add comments or notes..."
                          />
                        </div>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem', display: 'block' }}>Link to Objective</label>
                          <select
                            value={popupData.req.linkedObjective}
                            onChange={(e) => updateRequirement(popupData.reqId, 'linkedObjective', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                              fontSize: '0.9rem'
                            }}
                          >
                            <option value="">No objective linked</option>
                            <option value="obj1">Objective 1</option>
                            <option value="obj2">Objective 2</option>
                            <option value="obj3">Objective 3</option>
                          </select>
                        </div>
                        
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                          <button
                            onClick={() => {
                              removeRequirement(popupData.reqId);
                              setPopupData(null);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #f44336, #d32f2f)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '0.75rem 1.5rem',
                              cursor: 'pointer',
                              fontSize: '0.9rem'
                            }}
                          >
                            Delete Requirement
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
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
            </div>
          )}
          <button className="btn btn-primary" onClick={saveTabData}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default MissionWorkspace;