import React, { useState } from 'react';
import { Stack, Group, Button, TextInput, Textarea, Select, Card, Text, Badge, ActionIcon, Title, Box, Modal, Loader } from '@mantine/core';
import { IconPlus, IconTrash, IconWand, IconClipboardList, IconSettings, IconShield, IconEdit } from '@tabler/icons-react';
import { Requirement, RequirementType, Priority, createRequirement, Objective } from '../types/models';
import { missionAPI } from '../services/api';

interface RequirementsTabProps {
  missionId: string;
  requirements?: Requirement[];
  objectives?: Objective[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const RequirementsTab: React.FC<RequirementsTabProps> = ({
  missionId,
  requirements,
  objectives,
  onRequirementsChange
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [newRequirement, setNewRequirement] = useState({
    title: '',
    type: 'functional' as RequirementType,
    description: '',
    priority: 'medium' as Priority
  });

  const addRequirement = () => {
    if (!newRequirement.title.trim()) return;
    
    const requirement = createRequirement(
      Date.now().toString(),
      newRequirement.title,
      newRequirement.type,
      newRequirement.description,
      newRequirement.priority
    );
    
    onRequirementsChange([...(requirements || []), requirement]);
    setNewRequirement({ title: '', type: 'functional', description: '', priority: 'medium' });
    setIsAdding(false);
  };

  const deleteRequirement = (id: string) => {
    onRequirementsChange((requirements || []).filter(req => req.id !== id));
  };

  const editRequirement = (requirement: Requirement) => {
    setEditingRequirement(requirement);
  };

  const saveEditedRequirement = () => {
    if (!editingRequirement) return;
    const updatedRequirements = (requirements || []).map(req => 
      req.id === editingRequirement.id ? editingRequirement : req
    );
    onRequirementsChange(updatedRequirements);
    setEditingRequirement(null);
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const generateRequirements = async () => {
    setIsGenerating(true);
    try {
      const response = await missionAPI.generateRequirements(missionId, objectives || []);
      if (response.success && Array.isArray(response.requirements)) {
        onRequirementsChange([...(requirements || []), ...response.requirements]);
      }
    } catch (error) {
      console.error('Failed to generate requirements:', error);
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

  const getTypeIcon = (type: RequirementType) => {
    switch (type) {
      case 'functional': return <IconSettings size={12} />;
      case 'performance': return <IconClipboardList size={12} />;
      case 'safety': return <IconShield size={12} />;
      default: return <IconClipboardList size={12} />;
    }
  };

  const getTypeColor = (type: RequirementType) => {
    switch (type) {
      case 'functional': return 'blue';
      case 'performance': return 'green';
      case 'interface': return 'purple';
      case 'operational': return 'orange';
      case 'safety': return 'red';
      case 'environmental': return 'teal';
      default: return 'gray';
    }
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="center">
        <Box>
          <Group align="center" gap="sm">
            <IconClipboardList size={24} color="#667eea" />
            <Title order={2} c="white">Mission Requirements</Title>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            Technical and operational specifications derived from objectives
          </Text>
        </Box>
        <Group>
          <Button 
            leftSection={<IconWand size={16} />} 
            variant="light" 
            color="violet" 
            onClick={generateRequirements}
            size="md"
          >
            AI Generate
          </Button>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => setIsAdding(true)}
            variant="gradient"
            gradient={{ from: '#667eea', to: '#764ba2' }}
            size="md"
          >
            Add Requirement
          </Button>
        </Group>
      </Group>

      {isAdding && (
        <Card className="glass-card-dark" padding="xl" radius="lg">
          <Stack gap="md">
            <TextInput
              label="Requirement Title"
              placeholder="Enter a specific, testable requirement"
              value={newRequirement.title}
              onChange={(e) => setNewRequirement({ ...newRequirement, title: e.target.value })}
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
              placeholder="Detailed specification and acceptance criteria"
              value={newRequirement.description}
              onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
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
                label="Requirement Type"
                value={newRequirement.type}
                onChange={(value: string | null) => setNewRequirement({ ...newRequirement, type: (value as RequirementType) || 'functional' })}
                data={[
                  { value: 'functional', label: '⚙️ Functional' },
                  { value: 'performance', label: '📊 Performance' },
                  { value: 'interface', label: '🔌 Interface' },
                  { value: 'operational', label: '🚀 Operational' },
                  { value: 'safety', label: '🛡️ Safety' },
                  { value: 'environmental', label: '🌍 Environmental' }
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
              <Select
                label="Priority Level"
                value={newRequirement.priority}
                onChange={(value: string | null) => setNewRequirement({ ...newRequirement, priority: (value as Priority) || 'medium' })}
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
              <Button onClick={addRequirement} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Requirement
              </Button>
              <Button variant="subtle" color="red" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      <Stack gap="md">
        {(requirements || []).map((requirement, index) => (
          <Card key={requirement.id} className="glass-card-dark floating-card" padding="xl" radius="lg">
            <Group justify="space-between" align="flex-start">
              <Stack gap="md" style={{ flex: 1 }}>
                <Group align="center" gap="sm">
                  <Badge size="sm" variant="light" color="blue">
                    REQ-{String(index + 1).padStart(3, '0')}
                  </Badge>
                  <Title order={4} c="white">{requirement.title}</Title>
                </Group>
                
                <Text c="rgba(255, 255, 255, 0.8)" size="sm" lineClamp={3}>
                  {requirement.description}
                </Text>
                
                <Group gap="xs">
                  <Badge 
                    color={getPriorityColor(requirement.priority)} 
                    size="sm"
                    leftSection={
                      requirement.priority === 'high' ? '🔴' : 
                      requirement.priority === 'medium' ? '🟡' : '🟢'
                    }
                  >
                    {requirement.priority?.toUpperCase() || 'MEDIUM'}
                  </Badge>
                  <Badge 
                    color={getTypeColor(requirement.type)} 
                    size="sm" 
                    leftSection={getTypeIcon(requirement.type)}
                  >
                    {requirement.type?.replace('_', ' ').toUpperCase() || 'FUNCTIONAL'}
                  </Badge>
                </Group>
              </Stack>
              
              <Group>
                <ActionIcon 
                  color="blue" 
                  variant="subtle" 
                  onClick={() => editRequirement(requirement)}
                  size="lg"
                >
                  <IconEdit size={18} />
                </ActionIcon>
                <ActionIcon 
                  color="red" 
                  variant="subtle" 
                  onClick={() => deleteRequirement(requirement.id)}
                  size="lg"
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>

      {(requirements || []).length === 0 && !isAdding && (
        <Card className="glass-card" padding="xl" radius="lg" style={{ textAlign: 'center' }}>
          <Stack align="center" gap="md">
            <IconClipboardList size={48} color="rgba(255, 255, 255, 0.3)" />
            <Title order={3} c="white">No requirements defined</Title>
            <Text c="dimmed" size="md">
              Define technical requirements or generate them from your objectives
            </Text>
          </Stack>
        </Card>
      )}

      <Modal
        opened={!!editingRequirement}
        onClose={() => setEditingRequirement(null)}
        title="Edit Requirement"
        size="lg"
        styles={{
          content: { backgroundColor: 'rgba(26, 27, 35, 0.95)' },
          header: { backgroundColor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
          title: { color: 'white', fontWeight: 600 }
        }}
      >
        {editingRequirement && (
          <Stack gap="md">
            <TextInput
              label="Title"
              value={editingRequirement.title}
              onChange={(e) => setEditingRequirement({ ...editingRequirement, title: e.target.value })}
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
              value={editingRequirement.description}
              onChange={(e) => setEditingRequirement({ ...editingRequirement, description: e.target.value })}
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
                label="Type"
                value={editingRequirement.type}
                onChange={(value: string | null) => setEditingRequirement({ ...editingRequirement, type: (value as RequirementType) || 'functional' })}
                data={[
                  { value: 'functional', label: '⚙️ Functional' },
                  { value: 'performance', label: '📊 Performance' },
                  { value: 'interface', label: '🔌 Interface' },
                  { value: 'operational', label: '🚀 Operational' },
                  { value: 'safety', label: '🛡️ Safety' },
                  { value: 'environmental', label: '🌍 Environmental' }
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
              <Select
                label="Priority"
                value={editingRequirement.priority}
                onChange={(value: string | null) => setEditingRequirement({ ...editingRequirement, priority: (value as Priority) || 'medium' })}
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
              <Button onClick={saveEditedRequirement} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Changes
              </Button>
              <Button variant="subtle" color="red" onClick={() => setEditingRequirement(null)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default RequirementsTab;