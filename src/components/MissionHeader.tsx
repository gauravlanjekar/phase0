import React, { useState } from 'react';
import { Group, Title, Badge, TextInput, ActionIcon, Text } from '@mantine/core';
import { IconSatellite, IconEdit, IconCheck, IconX } from '@tabler/icons-react';
import { missionAPI } from '../services/api';

interface MissionHeaderProps {
  missionId: string;
  missionName?: string;
  onNameUpdate?: (name: string) => void;
}

const MissionHeader: React.FC<MissionHeaderProps> = ({ missionId, missionName, onNameUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(missionName || `Mission ${missionId}`);

  const handleSave = async () => {
    try {
      await missionAPI.updateMissionName(missionId, editName);
      onNameUpdate?.(editName);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update mission name:', error);
    }
  };

  const handleCancel = () => {
    setEditName(missionName || `Mission ${missionId}`);
    setIsEditing(false);
  };

  return (
    <Group align="center" gap="sm">
      <IconSatellite size={32} color="#667eea" />
      {isEditing ? (
        <Group gap="xs">
          <TextInput
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            size="lg"
            style={{ fontSize: '2rem' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <ActionIcon color="green" onClick={handleSave}>
            <IconCheck size={16} />
          </ActionIcon>
          <ActionIcon color="red" onClick={handleCancel}>
            <IconX size={16} />
          </ActionIcon>
        </Group>
      ) : (
        <Group gap="xs">
          <Title order={1} c="white" size="2rem">
            {missionName || `Mission ${missionId}`}
          </Title>
          <ActionIcon variant="subtle" onClick={() => setIsEditing(true)}>
            <IconEdit size={16} />
          </ActionIcon>
        </Group>
      )}
      <Badge variant="gradient" gradient={{ from: '#667eea', to: '#764ba2' }} size="lg">
        Active
      </Badge>
    </Group>
  );
};

export default MissionHeader;