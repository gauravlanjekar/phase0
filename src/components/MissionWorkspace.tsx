import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Tabs, Button, Group, Title, Drawer, Box, Badge, ActionIcon } from '@mantine/core';
import { IconArrowLeft, IconMessageCircle, IconTarget, IconClipboardList, IconShield, IconSatellite, IconRocket } from '@tabler/icons-react';
import { Objective, Requirement, Constraint, DesignSolution } from '../types/models';
import { missionAPI } from '../services/api';
import ObjectivesTab from './ObjectivesTab';
import RequirementsTab from './RequirementsTab';
import ConstraintsTab from './ConstraintsTab';
import DesignSolutionsTab from './DesignSolutionsTab';
import ChatDrawer from './ChatDrawer';

const MissionWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>('objectives');
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [solutions, setSolutions] = useState<DesignSolution[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('isAuthenticated')) {
      navigate('/login');
      return;
    }
    if (!id) return;
    loadTabData();
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
      const [objData, reqData, conData, solData] = await Promise.all([
        missionAPI.getTabData(id, 0),
        missionAPI.getTabData(id, 1),
        missionAPI.getTabData(id, 2),
        missionAPI.getTabData(id, 3)
      ]);
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
              <Group align="center" gap="sm">
                <IconSatellite size={32} color="#667eea" />
                <Title order={1} c="white" size="2rem">
                  Mission {id}
                </Title>
                <Badge variant="gradient" gradient={{ from: '#667eea', to: '#764ba2' }} size="lg">
                  Active
                </Badge>
              </Group>
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