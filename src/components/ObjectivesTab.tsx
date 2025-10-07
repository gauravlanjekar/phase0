import React, { useState } from 'react';
import { Stack, Group, Button, TextInput, Textarea, Select, Card, Text, Badge, ActionIcon, Title, Box, Modal, Loader } from '@mantine/core';
import { IconPlus, IconTrash, IconWand, IconTarget, IconUsers, IconNotes, IconEdit } from '@tabler/icons-react';
import { Objective, Priority, createObjective } from '../types/models';
import { missionAPI } from '../services/api';

interface ObjectivesTabProps {
  missionId: string;
  objectives?: Objective[];
  onObjectivesChange: (objectives: Objective[]) => void;
}

const ObjectivesTab: React.FC<ObjectivesTabProps> = ({
  missionId,
  objectives,
  onObjectivesChange
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [newObjective, setNewObjective] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    category: 'earth_observation'
  });

  const addObjective = () => {
    if (!newObjective.title.trim()) return;
    
    const objective = createObjective(
      Date.now().toString(),
      newObjective.title,
      newObjective.description,
      newObjective.priority
    );
    objective.category = newObjective.category;
    
    onObjectivesChange([...(objectives || []), objective]);
    setNewObjective({ title: '', description: '', priority: 'medium', category: 'earth_observation' });
    setIsAdding(false);
  };

  const deleteObjective = (id: string) => {
    onObjectivesChange((objectives || []).filter(obj => obj.id !== id));
  };

  const editObjective = (objective: Objective) => {
    setEditingObjective(objective);
  };

  const saveEditedObjective = () => {
    if (!editingObjective) return;
    const updatedObjectives = (objectives || []).map(obj => 
      obj.id === editingObjective.id ? editingObjective : obj
    );
    onObjectivesChange(updatedObjectives);
    setEditingObjective(null);
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const generateObjectives = async () => {
    setIsGenerating(true);
    try {
      const response = await missionAPI.generateObjectives(missionId, 'Mission brief');
      if (response.success && Array.isArray(response.objectives)) {
        onObjectivesChange([...(objectives || []), ...response.objectives]);
      }
    } catch (error) {
      console.error('Failed to generate objectives:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="center">
        <Box>
          <Group align="center" gap="sm">
            <IconTarget size={24} color="#667eea" />
            <Title order={2} c="white">Mission Objectives</Title>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            Define the primary goals and outcomes for your mission
          </Text>
        </Box>
        <Group>
          <Button 
            leftSection={isGenerating ? <Loader size={16} /> : <IconWand size={16} />} 
            variant="light" 
            color="violet" 
            onClick={generateObjectives}
            disabled={isGenerating}
            size="md"
          >
            {isGenerating ? 'Generating...' : 'AI Generate'}
          </Button>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => setIsAdding(true)}
            variant="gradient"
            gradient={{ from: '#667eea', to: '#764ba2' }}
            size="md"
          >
            Add Objective
          </Button>
        </Group>
      </Group>

      {isAdding && (
        <Card className="glass-card-dark" padding="xl" radius="lg">
          <Stack gap="md">
            <TextInput
              label="Objective Title"
              placeholder="Enter a clear, measurable objective"
              value={newObjective.title}
              onChange={(e) => setNewObjective({ ...newObjective, title: e.target.value })}
              size="md"
              styles={{
                input: {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white'
                },
                label: { color: 'white', fontWeight: 500 }
              }}
            />
            <Textarea
              label="Description"
              placeholder="Provide detailed description of this objective"
              value={newObjective.description}
              onChange={(e) => setNewObjective({ ...newObjective, description: e.target.value })}
              rows={4}
              styles={{
                input: {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white'
                },
                label: { color: 'white', fontWeight: 500 }
              }}
            />
            <Group grow>
              <Select
                label="Priority Level"
                value={newObjective.priority}
                onChange={(value: string | null) => setNewObjective({ ...newObjective, priority: (value as Priority) || 'medium' })}
                data={[
                  { value: 'low', label: '🟢 Low Priority' },
                  { value: 'medium', label: '🟡 Medium Priority' },
                  { value: 'high', label: '🔴 High Priority' }
                ]}
                styles={{
                  input: {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white'
                  },
                  label: { color: 'white', fontWeight: 500 }
                }}
              />
            </Group>
            <Group>
              <Button onClick={addObjective} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Objective
              </Button>
              <Button variant="subtle" color="red" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      <Stack gap="md">
        {(objectives || []).map((objective, index) => (
          <Card key={objective.id} className="glass-card-dark floating-card" padding="xl" radius="lg">
            <Group justify="space-between" align="flex-start">
              <Stack gap="md" style={{ flex: 1 }}>
                <Group align="center" gap="sm">
                  <Badge size="sm" variant="light" color="blue">
                    #{index + 1}
                  </Badge>
                  <Title order={4} c="white">{objective.title}</Title>
                </Group>
                
                <Text c="rgba(255, 255, 255, 0.8)" size="sm" lineClamp={3}>
                  {objective.description}
                </Text>
                
                <Group gap="xs">
                  <Badge 
                    color={getPriorityColor(objective.priority)} 
                    size="sm"
                    leftSection={
                      objective.priority === 'high' ? '🔴' : 
                      objective.priority === 'medium' ? '🟡' : '🟢'
                    }
                  >
                    {objective.priority?.toUpperCase() || 'MEDIUM'}
                  </Badge>
                  <Badge color="cyan" size="sm" leftSection={<IconTarget size={12} />}>
                    {objective.category?.replace('_', ' ') || 'general'}
                  </Badge>
                  {objective.stakeholders?.length > 0 && (
                    <Badge color="grape" size="sm" leftSection={<IconUsers size={12} />}>
                      {objective.stakeholders.length} stakeholders
                    </Badge>
                  )}
                  {objective.notes && (
                    <Badge color="orange" size="sm" leftSection={<IconNotes size={12} />}>
                      Has notes
                    </Badge>
                  )}
                </Group>
              </Stack>
              
              <Group>
                <ActionIcon 
                  color="blue" 
                  variant="subtle" 
                  onClick={() => editObjective(objective)}
                  size="lg"
                >
                  <IconEdit size={18} />
                </ActionIcon>
                <ActionIcon 
                  color="red" 
                  variant="subtle" 
                  onClick={() => deleteObjective(objective.id)}
                  size="lg"
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>

      {(objectives || []).length === 0 && !isAdding && (
        <Card className="glass-card" padding="xl" radius="lg" style={{ textAlign: 'center' }}>
          <Stack align="center" gap="md">
            <IconTarget size={48} color="rgba(255, 255, 255, 0.3)" />
            <Title order={3} c="white">No objectives defined</Title>
            <Text c="dimmed" size="md">
              Start by defining your mission objectives or use AI to generate them automatically
            </Text>
          </Stack>
        </Card>
      )}

      <Modal
        opened={!!editingObjective}
        onClose={() => setEditingObjective(null)}
        title="Edit Objective"
        size="lg"
        styles={{
          content: { backgroundColor: 'rgba(26, 27, 35, 0.95)' },
          header: { backgroundColor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
          title: { color: 'white', fontWeight: 600 }
        }}
      >
        {editingObjective && (
          <Stack gap="md">
            <TextInput
              label="Title"
              value={editingObjective.title}
              onChange={(e) => setEditingObjective({ ...editingObjective, title: e.target.value })}
              styles={{
                input: {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white'
                },
                label: { color: 'white', fontWeight: 500 }
              }}
            />
            <Textarea
              label="Description"
              value={editingObjective.description}
              onChange={(e) => setEditingObjective({ ...editingObjective, description: e.target.value })}
              rows={4}
              styles={{
                input: {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white'
                },
                label: { color: 'white', fontWeight: 500 }
              }}
            />
            <Select
              label="Priority"
              value={editingObjective.priority}
              onChange={(value: string | null) => setEditingObjective({ ...editingObjective, priority: (value as Priority) || 'medium' })}
              data={[
                { value: 'low', label: '🟢 Low Priority' },
                { value: 'medium', label: '🟡 Medium Priority' },
                { value: 'high', label: '🔴 High Priority' }
              ]}
              styles={{
                input: {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white'
                },
                label: { color: 'white', fontWeight: 500 }
              }}
            />
            <Group>
              <Button onClick={saveEditedObjective} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Changes
              </Button>
              <Button variant="subtle" color="red" onClick={() => setEditingObjective(null)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default ObjectivesTab;