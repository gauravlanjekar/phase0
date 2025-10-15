import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Tabs, Button, Group, Title, Drawer, Box, Badge, ActionIcon, Text } from '@mantine/core';
import { IconArrowLeft, IconMessageCircle, IconTarget, IconClipboardList, IconShield, IconSatellite, IconRocket } from '@tabler/icons-react';
import { Objective, Requirement, Constraint, DesignSolution, Mission } from '../types/models';
import { missionAPI } from '../services/api';
import ObjectivesTab from './ObjectivesTab';
import RequirementsTab from './RequirementsTab';
import ConstraintsTab from './ConstraintsTab';
import DesignSolutionsTab from './DesignSolutionsTab';
import ChatDrawer from './ChatDrawer';
import MissionHeader from './MissionHeader';

const MissionWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>('objectives');
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [solutions, setSolutions] = useState<DesignSolution[]>([]);
  const [mission, setMission] = useState<Mission | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    loadTabData();

    // Listen for chat open events
    const handleOpenChat = (event: CustomEvent) => {
      const { message, missionId } = event.detail;
      if (missionId === id) {
        setChatMessage(message);
        setIsChatOpen(true);
      }
    };

    // Listen for agent responses to refresh data
    const handleAgentResponse = (event: CustomEvent) => {
      const { missionId } = event.detail;
      if (missionId === id) {
        loadTabData();
      }
    };

    window.addEventListener('openChatWithMessage', handleOpenChat as EventListener);
    window.addEventListener('agentResponseReceived', handleAgentResponse as EventListener);
    return () => {
      window.removeEventListener('openChatWithMessage', handleOpenChat as EventListener);
      window.removeEventListener('agentResponseReceived', handleAgentResponse as EventListener);
    };
  }, [id, navigate]);

  // Refresh data when tab changes
  useEffect(() => {
    if (id && activeTab) {
      loadTabData();
    }
  }, [activeTab, id]);

  const loadTabData = async () => {
    if (!id) return;
    try {
      const [missionData, objData, reqData, conData, solData] = await Promise.all([
        missionAPI.getMissions().then(missions => missions.find(m => m.id === id)),
        missionAPI.getTabData(id, 0),
        missionAPI.getTabData(id, 1),
        missionAPI.getTabData(id, 2),
        missionAPI.getTabData(id, 3)
      ]);
      setMission(missionData || null);
      setObjectives(objData.objectives || []);
      setRequirements(reqData.requirements || []);
      setConstraints(conData.constraints || []);
      setSolutions(solData.designSolutions || []);
    } catch (error) {
      console.error('Failed to load tab data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTabData = async (tabIndex: number, data: any) => {
    if (!id) return;
    try {
      await missionAPI.saveTabData(id, tabIndex, data);
    } catch (error) {
      console.error('Failed to save tab data:', error);
    }
  };

  const handleObjectivesChange = (newObjectives: Objective[]) => {
    setObjectives(newObjectives);
    saveTabData(0, { objectives: newObjectives });
  };

  const handleRequirementsChange = (newRequirements: Requirement[]) => {
    setRequirements(newRequirements);
    saveTabData(1, { requirements: newRequirements });
  };

  const handleConstraintsChange = (newConstraints: Constraint[]) => {
    setConstraints(newConstraints);
    saveTabData(2, { constraints: newConstraints });
  };

  const handleSolutionsChange = (newSolutions: DesignSolution[]) => {
    setSolutions(newSolutions);
    saveTabData(3, { designSolutions: newSolutions });
  };

  if (loading) {
    return (
      <div className="content-wrapper">
        <Container size="xl" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Title order={2} c="white">Loading mission workspace...</Title>
        </Container>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <Container size="xl" py="md">
        <Group justify="space-between" mb="xl">
          <Group>
            <Button 
              leftSection={<IconArrowLeft size={16} />} 
              variant="light" 
              onClick={() => navigate('/dashboard')}
              size="md"
            >
              Back to Control
            </Button>
            <Box>
              <MissionHeader 
                missionId={id!}
                missionName={mission?.name}
                onNameUpdate={(name) => setMission(prev => prev ? {...prev, name} : null)}
              />
              {mission?.brief && (
                <Paper className="glass-card" p="md" radius="md" mt="sm" style={{ maxWidth: '600px' }}>
                  <Title order={6} c="dimmed" mb="xs">Mission Brief</Title>
                  <Text c="white" size="sm">{mission.brief}</Text>
                </Paper>
              )}
            </Box>
          </Group>
        </Group>

        <Paper className="glass-card" radius="xl" style={{ overflow: 'hidden' }}>
          <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
            <Tabs.List 
              p="md" 
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <Tabs.Tab 
                value="objectives" 
                leftSection={<IconTarget size={16} />}
                style={{ color: 'white' }}
              >
                Objectives ({(objectives || []).length})
              </Tabs.Tab>
              <Tabs.Tab 
                value="requirements" 
                leftSection={<IconClipboardList size={16} />}
                style={{ color: 'white' }}
              >
                Requirements ({(requirements || []).length})
              </Tabs.Tab>
              <Tabs.Tab 
                value="constraints" 
                leftSection={<IconShield size={16} />}
                style={{ color: 'white' }}
              >
                Constraints ({(constraints || []).length})
              </Tabs.Tab>
              <Tabs.Tab 
                value="solutions" 
                leftSection={<IconRocket size={16} />}
                style={{ color: 'white' }}
              >
                Solutions ({(solutions || []).length})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="objectives" p="xl">
              <ObjectivesTab
                missionId={id!}
                objectives={objectives}
                requirements={requirements}
                onObjectivesChange={handleObjectivesChange}
                onRefresh={loadTabData}
              />
            </Tabs.Panel>

            <Tabs.Panel value="requirements" p="xl">
              <RequirementsTab
                missionId={id!}
                requirements={requirements}
                objectives={objectives}
                onRequirementsChange={handleRequirementsChange}
                onRefresh={loadTabData}
              />
            </Tabs.Panel>

            <Tabs.Panel value="constraints" p="xl">
              <ConstraintsTab
                missionId={id!}
                constraints={constraints}
                objectives={objectives}
                requirements={requirements}
                onConstraintsChange={handleConstraintsChange}
                onRefresh={loadTabData}
              />
            </Tabs.Panel>

            <Tabs.Panel value="solutions" p="xl">
              <DesignSolutionsTab
                missionId={id!}
                solutions={solutions}
                objectives={objectives}
                requirements={requirements}
                constraints={constraints}
                onSolutionsChange={handleSolutionsChange}
                onRefresh={loadTabData}
              />
            </Tabs.Panel>
          </Tabs>
        </Paper>

        <Drawer
          opened={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          position="right"
          size="lg"
          title="Mission Assistant"
          overlayProps={{ backgroundOpacity: 0.3, blur: 4 }}
          styles={{
            content: { backgroundColor: 'rgba(26, 27, 35, 0.95)' },
            header: { backgroundColor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
            title: { color: 'white', fontWeight: 600 }
          }}
        >
          <ChatDrawer
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            missionId={id!}
            initialMessage={chatMessage}
            onMessageSent={() => setChatMessage('')}
          />
        </Drawer>

        {/* Floating Chat Button */}
        <ActionIcon
          onClick={() => setIsChatOpen(true)}
          size={60}
          radius="xl"
          variant="gradient"
          gradient={{ from: '#11998e', to: '#38ef7d' }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(17, 153, 142, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(17, 153, 142, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(17, 153, 142, 0.3)';
          }}
        >
          <IconMessageCircle size={28} />
        </ActionIcon>
      </Container>
    </div>
  );
};

export default MissionWorkspace;