import React, { useState } from 'react';
import { Stack, Group, Button, TextInput, Textarea, Select, Card, Text, Badge, ActionIcon, Title, NumberInput, Checkbox, Box, Modal, Loader } from '@mantine/core';
import { IconPlus, IconTrash, IconWand, IconShield, IconScale, IconLock, IconEdit } from '@tabler/icons-react';
import { Constraint, ConstraintType, ConstraintOperator, Priority, createConstraint, Objective, Requirement } from '../types/models';
import { missionAPI } from '../services/api';

interface ConstraintsTabProps {
  missionId: string;
  constraints?: Constraint[];
  objectives?: Objective[];
  requirements?: Requirement[];
  onConstraintsChange: (constraints: Constraint[]) => void;
  onRefresh?: () => void;
}

const ConstraintsTab: React.FC<ConstraintsTabProps> = ({
  missionId,
  constraints,
  objectives,
  requirements,
  onConstraintsChange,
  onRefresh
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<Constraint | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newConstraint, setNewConstraint] = useState({
    title: '',
    constraint_type: 'budget' as ConstraintType,
    operator: 'less_than' as ConstraintOperator,
    value: 0,
    unit: 'USD',
    priority: 'medium' as Priority,
    rationale: '',
    is_negotiable: false
  });

  const addConstraint = () => {
    if (!newConstraint.title.trim()) return;
    
    const constraint = createConstraint(
      Date.now().toString(),
      newConstraint.title,
      newConstraint.constraint_type,
      {
        operator: newConstraint.operator,
        value: newConstraint.value,
        unit: newConstraint.unit
      },
      newConstraint.priority
    );
    constraint.rationale = newConstraint.rationale;
    constraint.is_negotiable = newConstraint.is_negotiable;
    
    onConstraintsChange([...(constraints || []), constraint]);
    setNewConstraint({
      title: '',
      constraint_type: 'budget',
      operator: 'less_than',
      value: 0,
      unit: 'USD',
      priority: 'medium',
      rationale: '',
      is_negotiable: false
    });
    setIsAdding(false);
  };

  const deleteConstraint = (id: string) => {
    onConstraintsChange((constraints || []).filter(con => con.id !== id));
  };

  const editConstraint = (constraint: Constraint) => {
    setEditingConstraint(constraint);
  };

  const saveEditedConstraint = () => {
    if (!editingConstraint) return;
    const updatedConstraints = (constraints || []).map(con => 
      con.id === editingConstraint.id ? editingConstraint : con
    );
    onConstraintsChange(updatedConstraints);
    setEditingConstraint(null);
  };

  const generateConstraints = async () => {
    setIsGenerating(true);
    try {
      const response = await missionAPI.generateConstraints(missionId, objectives || [], requirements || []);
      if (response.success && Array.isArray(response.constraints)) {
        onConstraintsChange([...(constraints || []), ...response.constraints]);
        onRefresh?.();
      }
    } catch (error) {
      console.error('Failed to generate constraints:', error);
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

  const getTypeColor = (type: ConstraintType) => {
    switch (type) {
      case 'budget': return 'green';
      case 'mass': return 'blue';
      case 'power': return 'yellow';
      case 'volume': return 'purple';
      case 'schedule': return 'orange';
      case 'risk': return 'red';
      case 'technology': return 'cyan';
      case 'regulatory': return 'gray';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: ConstraintType) => {
    switch (type) {
      case 'budget': return <IconScale size={12} />;
      case 'mass': return <IconScale size={12} />;
      case 'power': return <IconScale size={12} />;
      default: return <IconShield size={12} />;
    }
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="center">
        <Box>
          <Group align="center" gap="sm">
            <IconShield size={24} color="#667eea" />
            <Title order={2} c="white">Mission Constraints</Title>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            Define limits and boundaries that must be respected in your mission design
          </Text>
        </Box>
        <Group>
          <Button 
            leftSection={isGenerating ? <Loader size={18} color="white" /> : <IconWand size={18} />} 
            variant="gradient"
            gradient={{ from: '#667eea', to: '#764ba2' }}
            onClick={generateConstraints}
            disabled={isGenerating}
            size="lg"
            style={{
              boxShadow: isGenerating ? 'none' : '0 4px 20px rgba(102, 126, 234, 0.4)',
              transform: isGenerating ? 'none' : 'translateY(-1px)'
            }}
          >
            {isGenerating ? 'Generating Constraints...' : '✨ AI Generate'}
          </Button>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => setIsAdding(true)}
            variant="gradient"
            gradient={{ from: '#667eea', to: '#764ba2' }}
            size="md"
          >
            Add Constraint
          </Button>
        </Group>
      </Group>

      {isAdding && (
        <Card className="glass-card-dark" padding="xl" radius="lg">
          <Stack gap="md">
            <TextInput
              label="Constraint Title"
              placeholder="Enter a specific constraint"
              value={newConstraint.title}
              onChange={(e) => setNewConstraint({ ...newConstraint, title: e.target.value })}
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
            <Group grow>
              <Select
                label="Constraint Type"
                value={newConstraint.constraint_type}
                onChange={(value: string | null) => setNewConstraint({ ...newConstraint, constraint_type: (value as ConstraintType) || 'budget' })}
                data={[
                  { value: 'budget', label: '💰 Budget' },
                  { value: 'mass', label: '⚖️ Mass' },
                  { value: 'power', label: '⚡ Power' },
                  { value: 'volume', label: '📦 Volume' },
                  { value: 'schedule', label: '📅 Schedule' },
                  { value: 'risk', label: '⚠️ Risk' },
                  { value: 'technology', label: '🔬 Technology' },
                  { value: 'regulatory', label: '📋 Regulatory' }
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
                label="Operator"
                value={newConstraint.operator}
                onChange={(value: string | null) => setNewConstraint({ ...newConstraint, operator: (value as ConstraintOperator) || 'less_than' })}
                data={[
                  { value: 'less_than', label: '< Less than' },
                  { value: 'greater_than', label: '> Greater than' },
                  { value: 'equal_to', label: '= Equal to' },
                  { value: 'between', label: '≈ Between' }
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
            <Group grow>
              <NumberInput
                label="Value"
                value={newConstraint.value}
                onChange={(value: string | number) => setNewConstraint({ ...newConstraint, value: Number(value) || 0 })}
                styles={{
                  input: {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white'
                  },
                  label: { color: 'white', fontWeight: 500 }
                }}
              />
              <TextInput
                label="Unit"
                value={newConstraint.unit}
                onChange={(e) => setNewConstraint({ ...newConstraint, unit: e.target.value })}
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
            <Textarea
              label="Rationale"
              placeholder="Why is this constraint important?"
              value={newConstraint.rationale}
              onChange={(e) => setNewConstraint({ ...newConstraint, rationale: e.target.value })}
              rows={3}
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
              <Select
                label="Priority Level"
                value={newConstraint.priority}
                onChange={(value: string | null) => setNewConstraint({ ...newConstraint, priority: (value as Priority) || 'medium' })}
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
              <Checkbox
                label="Negotiable"
                checked={newConstraint.is_negotiable}
                onChange={(e) => setNewConstraint({ ...newConstraint, is_negotiable: e.target.checked })}
                mt="xl"
                styles={{
                  label: { color: 'white' }
                }}
              />
            </Group>
            <Group>
              <Button onClick={addConstraint} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Constraint
              </Button>
              <Button variant="subtle" color="red" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      <Stack gap="md">
        {(constraints || []).map((constraint, index) => (
          <Card key={constraint.id} className="glass-card-dark floating-card" padding="xl" radius="lg">
            <Group justify="space-between" align="flex-start">
              <Stack gap="md" style={{ flex: 1 }}>
                <Group align="center" gap="sm">
                  <Badge size="sm" variant="light" color="blue">
                    CON-{String(index + 1).padStart(3, '0')}
                  </Badge>
                  <Title order={4} c="white">{constraint.title}</Title>
                </Group>
                
                <Text c="rgba(255, 255, 255, 0.8)" size="sm">
                  {constraint.constraint?.operator?.replace('_', ' ') || 'less_than'} {constraint.constraint?.value || 0} {constraint.constraint?.unit || 'units'}
                </Text>
                
                {constraint.rationale && (
                  <Text c="rgba(255, 255, 255, 0.6)" size="xs" lineClamp={2}>
                    {constraint.rationale}
                  </Text>
                )}
                
                <Group gap="xs">
                  <Badge 
                    color={getPriorityColor(constraint.priority)} 
                    size="sm"
                    leftSection={
                      constraint.priority === 'high' ? '🔴' : 
                      constraint.priority === 'medium' ? '🟡' : '🟢'
                    }
                  >
                    {constraint.priority?.toUpperCase() || 'MEDIUM'}
                  </Badge>
                  <Badge 
                    color={getTypeColor(constraint.constraint_type)} 
                    size="sm" 
                    leftSection={getTypeIcon(constraint.constraint_type)}
                  >
                    {constraint.constraint_type?.replace('_', ' ').toUpperCase() || 'GENERAL'}
                  </Badge>
                  {constraint.is_negotiable && (
                    <Badge color="orange" size="sm" leftSection={<IconLock size={12} />}>
                      Negotiable
                    </Badge>
                  )}
                </Group>
              </Stack>
              
              <Group>
                <ActionIcon 
                  color="blue" 
                  variant="subtle" 
                  onClick={() => editConstraint(constraint)}
                  size="lg"
                >
                  <IconEdit size={18} />
                </ActionIcon>
                <ActionIcon 
                  color="red" 
                  variant="subtle" 
                  onClick={() => deleteConstraint(constraint.id)}
                  size="lg"
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>

      {(constraints || []).length === 0 && !isAdding && (
        <Card className="glass-card" padding="xl" radius="lg" style={{ textAlign: 'center' }}>
          <Stack align="center" gap="md">
            <IconShield size={48} color="rgba(255, 255, 255, 0.3)" />
            <Title order={3} c="white">No constraints defined</Title>
            <Text c="dimmed" size="md">
              Define mission constraints or generate them from your objectives and requirements
            </Text>
          </Stack>
        </Card>
      )}

      <Modal
        opened={!!editingConstraint}
        onClose={() => setEditingConstraint(null)}
        title="Edit Constraint"
        size="lg"
        styles={{
          content: { backgroundColor: 'rgba(26, 27, 35, 0.95)' },
          header: { backgroundColor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
          title: { color: 'white', fontWeight: 600 }
        }}
      >
        {editingConstraint && (
          <Stack gap="md">
            <TextInput
              label="Title"
              value={editingConstraint.title}
              onChange={(e) => setEditingConstraint({ ...editingConstraint, title: e.target.value })}
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
                value={editingConstraint.constraint_type}
                onChange={(value: string | null) => setEditingConstraint({ ...editingConstraint, constraint_type: (value as ConstraintType) || 'budget' })}
                data={[
                  { value: 'budget', label: '💰 Budget' },
                  { value: 'mass', label: '⚖️ Mass' },
                  { value: 'power', label: '⚡ Power' },
                  { value: 'volume', label: '📦 Volume' },
                  { value: 'schedule', label: '📅 Schedule' },
                  { value: 'risk', label: '⚠️ Risk' },
                  { value: 'technology', label: '🔬 Technology' },
                  { value: 'regulatory', label: '📋 Regulatory' }
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
                label="Operator"
                value={editingConstraint.constraint?.operator}
                onChange={(value: string | null) => setEditingConstraint({ 
                  ...editingConstraint, 
                  constraint: { 
                    ...editingConstraint.constraint, 
                    operator: (value as ConstraintOperator) || 'less_than' 
                  }
                })}
                data={[
                  { value: 'less_than', label: '< Less than' },
                  { value: 'greater_than', label: '> Greater than' },
                  { value: 'equal_to', label: '= Equal to' },
                  { value: 'between', label: '≈ Between' }
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
            <Group grow>
              <NumberInput
                label="Value"
                value={Array.isArray(editingConstraint.constraint?.value) ? editingConstraint.constraint.value[0] : editingConstraint.constraint?.value}
                onChange={(value: string | number) => setEditingConstraint({ 
                  ...editingConstraint, 
                  constraint: { 
                    ...editingConstraint.constraint, 
                    value: Number(value) || 0 
                  }
                })}
                styles={{
                  input: {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white'
                  },
                  label: { color: 'white', fontWeight: 500 }
                }}
              />
              <TextInput
                label="Unit"
                value={editingConstraint.constraint?.unit}
                onChange={(e) => setEditingConstraint({ 
                  ...editingConstraint, 
                  constraint: { 
                    ...editingConstraint.constraint, 
                    unit: e.target.value 
                  }
                })}
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
            <Textarea
              label="Rationale"
              value={editingConstraint.rationale}
              onChange={(e) => setEditingConstraint({ ...editingConstraint, rationale: e.target.value })}
              rows={3}
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
              <Select
                label="Priority"
                value={editingConstraint.priority}
                onChange={(value: string | null) => setEditingConstraint({ ...editingConstraint, priority: (value as Priority) || 'medium' })}
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
              <Checkbox
                label="Negotiable"
                checked={editingConstraint.is_negotiable}
                onChange={(e) => setEditingConstraint({ ...editingConstraint, is_negotiable: e.target.checked })}
                mt="xl"
                styles={{
                  label: { color: 'white' }
                }}
              />
            </Group>
            <Group>
              <Button onClick={saveEditedConstraint} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Changes
              </Button>
              <Button variant="subtle" color="red" onClick={() => setEditingConstraint(null)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default ConstraintsTab;