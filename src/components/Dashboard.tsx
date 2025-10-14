import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, TextInput, Button, Title, Group, Grid, Card, Text, Stack, ActionIcon, Box, Badge, Modal, Timeline, Loader, Alert } from '@mantine/core';
import { IconPlus, IconTrash, IconRocket, IconLogout, IconSatellite, IconCalendar, IconCheck, IconX, IconTarget, IconClipboardList, IconLock, IconTool, IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { Mission, TimelineStep, MissionCreationProgress } from '../types/models';
import { missionAPI } from '../services/api';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const Dashboard: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [newMissionBrief, setNewMissionBrief] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationProgress, setCreationProgress] = useState<MissionCreationProgress | null>(null);
  const navigate = useNavigate();
  const { transcript, isListening, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (!localStorage.getItem('isAuthenticated')) {
      navigate('/login');
      return;
    }
    loadMissions();
  }, [navigate]);

  useEffect(() => {
    if (transcript) {
      setNewMissionBrief(transcript.trim());
    }
  }, [transcript]);

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

  const createMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionBrief.trim()) return;

    const steps: TimelineStep[] = [
      { id: '1', title: 'Create Mission', description: 'Setting up mission framework and generating name', status: 'loading' }
    ];

    setCreationProgress({ missionId: '', steps, currentStep: 0, isComplete: false });
    setShowCreateModal(true);

    try {
      // Step 1: Create Mission
      const mission = await missionAPI.createMission(newMissionBrief);
      setCreationProgress(prev => prev ? {
        ...prev,
        missionId: mission.id,
        steps: prev.steps.map((step, idx) => idx === 0 ? { ...step, status: 'completed' } : step),
        currentStep: 1
      } : null);

      setCreationProgress(prev => prev ? {
        ...prev,
        steps: prev.steps.map((step, idx) => idx === 0 ? { ...step, status: 'completed' } : step),
        currentStep: 0,
        isComplete: true
      } : null);

      setMissions([...missions, mission]);
      setNewMissionBrief('');
    } catch (error) {
      console.error('Failed to create mission:', error);
      setCreationProgress(prev => prev ? {
        ...prev,
        steps: prev.steps.map((step, idx) => 
          idx === prev.currentStep ? { ...step, status: 'error', error: 'Generation failed' } : step
        )
      } : null);
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setCreationProgress(null);
  };

  const getStepIcon = (step: TimelineStep) => {
    switch (step.status) {
      case 'completed': return <IconCheck size={16} />;
      case 'loading': return <Loader size={16} />;
      case 'error': return <IconX size={16} />;
      default: return null;
    }
  };

  const getStepColor = (step: TimelineStep) => {
    switch (step.status) {
      case 'completed': return 'green';
      case 'loading': return 'blue';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const deleteMission = async (id: string) => {
    try {
      await missionAPI.deleteMission(id);
      setMissions(missions.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete mission:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="content-wrapper">
        <Container size="xl" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text size="xl" c="white">Loading missions...</Text>
        </Container>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <Container size="xl" py="xl">
        <Group justify="space-between" mb="xl">
          <Box>
            <Title order={1} c="white" size="2.5rem" mb="xs">
              Mission Control Center
            </Title>
            <Text c="dimmed" size="lg">Manage your space exploration missions</Text>
          </Box>
          <Button 
            leftSection={<IconLogout size={16} />} 
            variant="light" 
            color="red" 
            onClick={logout}
            size="md"
          >
            Logout
          </Button>
        </Group>

        <Paper className="glass-card" p="xl" radius="xl" mb="xl">
          <Group align="center" mb="md">
            <IconSatellite size={24} color="#667eea" />
            <Title order={2} c="white">Create New Mission</Title>
          </Group>
          <Text c="dimmed" mb="md">
            AI will automatically generate objectives, requirements, constraints, and design solutions
            {isSupported && <Text span c="blue" ml="xs">• Click the microphone to speak your mission brief</Text>}
          </Text>
          <Group>
            <TextInput
              placeholder={isListening ? "Listening..." : "Describe your mission objectives..."}
              value={newMissionBrief}
              onChange={(e) => setNewMissionBrief(e.target.value)}
              style={{ flex: 1 }}
              size="md"
              styles={{
                input: {
                  backgroundColor: isListening ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                  border: isListening ? '1px solid rgba(255, 0, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&::placeholder': { color: 'rgba(255, 255, 255, 0.6)' }
                }
              }}
            />
            {isSupported && (
              <ActionIcon
                onClick={isListening ? stopListening : () => { resetTranscript(); startListening(); }}
                size="lg"
                variant={isListening ? "filled" : "light"}
                color={isListening ? "red" : "blue"}
                style={{ animation: isListening ? 'pulse 1.5s infinite' : 'none' }}
              >
                {isListening ? <IconMicrophoneOff size={20} /> : <IconMicrophone size={20} />}
              </ActionIcon>
            )}
            <Button 
              onClick={() => newMissionBrief.trim() && createMission({ preventDefault: () => {} } as React.FormEvent)}
              leftSection={<IconPlus size={16} />}
              gradient={{ from: '#667eea', to: '#764ba2' }}
              variant="gradient"
              size="md"
              disabled={!newMissionBrief.trim()}
            >
              Create Mission
            </Button>
          </Group>
        </Paper>

        <Grid>
          {missions.map((mission) => (
            <Grid.Col key={mission.id} span={{ base: 12, md: 6, lg: 4 }}>
              <Card 
                className="glass-card-dark floating-card" 
                padding="xl" 
                radius="xl"
                style={{ height: '100%' }}
              >
                <Stack gap="md" h="100%">
                  <Group justify="space-between" align="flex-start">
                    <Badge 
                      variant="gradient" 
                      gradient={{ from: '#667eea', to: '#764ba2' }}
                      size="lg"
                    >
                      {mission.name || `Mission ${mission.id}`}
                    </Badge>
                    <ActionIcon 
                      color="red" 
                      variant="subtle" 
                      onClick={() => deleteMission(mission.id)}
                      size="lg"
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                  
                  <Text c="white" size="md" lineClamp={4} style={{ flex: 1 }}>
                    {mission.brief}
                  </Text>
                  
                  <Group gap="xs" align="center">
                    <IconCalendar size={14} color="rgba(255, 255, 255, 0.6)" />
                    <Text size="xs" c="dimmed">
                      {new Date(mission.createdAt).toLocaleDateString()}
                    </Text>
                  </Group>
                  
                  <Button
                    leftSection={<IconRocket size={16} />}
                    onClick={() => navigate(`/mission/${mission.id}`)}
                    fullWidth
                    variant="gradient"
                    gradient={{ from: '#11998e', to: '#38ef7d' }}
                    size="md"
                    mt="auto"
                  >
                    Launch Mission
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {missions.length === 0 && (
          <Paper className="glass-card" p="xl" radius="xl" style={{ textAlign: 'center' }}>
            <Stack align="center" gap="md">
              <IconSatellite size={64} color="rgba(255, 255, 255, 0.3)" />
              <Title order={3} c="white">No missions in orbit yet</Title>
              <Text c="dimmed" size="lg">Create your first space mission to begin exploration</Text>
            </Stack>
          </Paper>
        )}

        {/* Mission Creation Modal */}
        <Modal
          opened={showCreateModal}
          onClose={creationProgress?.isComplete ? closeModal : () => {}}
          title="Creating Mission"
          size="lg"
          closeOnClickOutside={false}
          closeOnEscape={false}
          styles={{
            content: { backgroundColor: 'rgba(26, 27, 35, 0.95)' },
            header: { backgroundColor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
            title: { color: 'white', fontWeight: 600 }
          }}
        >
          {creationProgress && (
            <Stack gap="lg">
              <Text c="white" size="md">Setting up your mission with AI-generated content...</Text>
              
              <Timeline active={creationProgress.currentStep} bulletSize={24} lineWidth={2}>
                {creationProgress.steps.map((step, index) => (
                  <Timeline.Item
                    key={step.id}
                    bullet={getStepIcon(step)}
                    title={<Text c="white" fw={500}>{step.title}</Text>}
                    color={getStepColor(step)}
                  >
                    <Text c="dimmed" size="sm">{step.description}</Text>
                    {step.error && (
                      <Alert color="red" mt="xs" variant="light">
                        {step.error}
                      </Alert>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>

              {creationProgress.isComplete && (
                <Group>
                  <Button 
                    onClick={() => {
                      closeModal();
                      navigate(`/mission/${creationProgress.missionId}`);
                    }}
                    variant="gradient"
                    gradient={{ from: '#11998e', to: '#38ef7d' }}
                    leftSection={<IconRocket size={16} />}
                  >
                    Launch Mission
                  </Button>
                  <Button variant="subtle" onClick={closeModal}>
                    Close
                  </Button>
                </Group>
              )}
            </Stack>
          )}
        </Modal>
      </Container>
    </div>
  );
};

export default Dashboard;