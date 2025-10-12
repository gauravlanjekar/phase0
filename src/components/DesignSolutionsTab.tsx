import React, { useState } from 'react';
import { Stack, Group, Button, Card, Text, Badge, ActionIcon, Title, Box, Grid, Collapse, Progress, NumberInput, Modal, TextInput, Textarea, Select, Tabs, Loader } from '@mantine/core';
import { IconPlus, IconTrash, IconWand, IconRocket, IconChevronDown, IconChevronUp, IconSatellite, IconBolt, IconWeight, IconCurrencyDollar, IconEdit, IconEye, IconWorld, IconPlanet, IconCheck, IconX, IconAlertTriangle, IconShieldCheck } from '@tabler/icons-react';
import { DesignSolution, Objective, Requirement, Constraint, Component, ComponentType, Orbit, GroundStation, ValidationResult, ValidationReport, PayloadComponent, PowerComponent, AvionicsComponent } from '../types/models';
import { missionAPI } from '../services/api';
import { validateAllRequirements } from '../utils/requirementValidation';

interface DesignSolutionsTabProps {
  missionId: string;
  solutions?: DesignSolution[];
  objectives?: Objective[];
  requirements?: Requirement[];
  constraints?: Constraint[];
  onSolutionsChange: (solutions: DesignSolution[]) => void;
  onRefresh?: () => void;
}

const DesignSolutionsTab: React.FC<DesignSolutionsTabProps> = ({
  missionId,
  solutions,
  objectives,
  requirements,
  constraints,
  onSolutionsChange,
  onRefresh
}) => {
  const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(new Set());
  const [expandedSpacecraft, setExpandedSpacecraft] = useState<Set<string>>(new Set());
  const [editingSolution, setEditingSolution] = useState<DesignSolution | null>(null);
  const [editingComponent, setEditingComponent] = useState<{ component: Component; solutionId: string } | null>(null);
  const [editingOrbit, setEditingOrbit] = useState<{ orbit: Orbit; solutionId: string } | null>(null);
  const [editingGroundStation, setEditingGroundStation] = useState<{ station: GroundStation; solutionId: string } | null>(null);
  const [validationReports, setValidationReports] = useState<Record<string, ValidationReport[]>>({});


  const toggleExpanded = (solutionId: string) => {
    const newExpanded = new Set(expandedSolutions);
    if (newExpanded.has(solutionId)) {
      newExpanded.delete(solutionId);
    } else {
      newExpanded.add(solutionId);
    }
    setExpandedSolutions(newExpanded);
  };

  const toggleSpacecraftExpanded = (spacecraftId: string) => {
    const newExpanded = new Set(expandedSpacecraft);
    if (newExpanded.has(spacecraftId)) {
      newExpanded.delete(spacecraftId);
    } else {
      newExpanded.add(spacecraftId);
    }
    setExpandedSpacecraft(newExpanded);
  };

  const deleteSolution = (id: string) => {
    onSolutionsChange((solutions || []).filter(sol => sol.id !== id));
  };

  const editSolution = (solution: DesignSolution) => {
    setEditingSolution(solution);
  };



  const saveEditedSolution = () => {
    if (!editingSolution) return;
    const updatedSolutions = (solutions || []).map(sol => 
      sol.id === editingSolution.id ? editingSolution : sol
    );
    onSolutionsChange(updatedSolutions);
    setEditingSolution(null);
  };

  const editComponent = (component: Component, solutionId: string) => {
    setEditingComponent({ component: { ...component }, solutionId });
  };

  const editOrbit = (orbit: Orbit, solutionId: string) => {
    setEditingOrbit({ orbit: { ...orbit }, solutionId });
  };

  const editGroundStation = (station: GroundStation, solutionId: string) => {
    setEditingGroundStation({ station: { ...station }, solutionId });
  };

  const saveEditedComponent = () => {
    if (!editingComponent) return;
    const updatedSolutions = (solutions || []).map(sol => {
      if (sol.id === editingComponent.solutionId && sol.spacecraft) {
        return {
          ...sol,
          spacecraft: sol.spacecraft.map(sc => ({
            ...sc,
            components: sc.components.map(comp => 
              comp.id === editingComponent.component.id ? editingComponent.component : comp
            )
          }))
        };
      }
      return sol;
    });
    onSolutionsChange(updatedSolutions);
    setEditingComponent(null);
  };

  const saveEditedOrbit = () => {
    if (!editingOrbit) return;
    const updatedSolutions = (solutions || []).map(sol => 
      sol.id === editingOrbit.solutionId ? { ...sol, orbit: editingOrbit.orbit } : sol
    );
    onSolutionsChange(updatedSolutions);
    setEditingOrbit(null);
  };

  const saveEditedGroundStation = () => {
    if (!editingGroundStation) return;
    const updatedSolutions = (solutions || []).map(sol => {
      if (sol.id === editingGroundStation.solutionId) {
        return {
          ...sol,
          groundStations: sol.groundStations.map(station => 
            station.id === editingGroundStation.station.id ? editingGroundStation.station : station
          )
        };
      }
      return sol;
    });
    onSolutionsChange(updatedSolutions);
    setEditingGroundStation(null);
  };



  const generateSolutions = () => {
    const message = `Generate 1 complete spacecraft design solution with ALL 8 standard components (payload, power, avionics, adcs, communications, structure, thermal, propulsion), sun-synchronous orbit, and ground stations.
Use get_solutions_schema and save_solutions tools.`;
    
    window.dispatchEvent(new CustomEvent('openChatWithMessage', { 
      detail: { message, missionId } 
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'blue';
      case 'under_evaluation': return 'yellow';
      case 'selected': return 'green';
      case 'rejected': return 'red';
      default: return 'gray';
    }
  };

  const calculateMetrics = (solution: DesignSolution) => {
    if (!solution.spacecraft || solution.spacecraft.length === 0) return { mass: 0, power: 0, cost: 0, reliability: 0 };
    
    let totalMass = 0, totalPowerGen = 0, totalPowerCons = 0, totalCost = 0, totalReliability = 1;
    
    solution.spacecraft.forEach(sc => {
      if (sc.components) {
        totalMass += sc.components.reduce((sum, c) => sum + (c.mass || 0), 0);
        totalPowerGen += sc.components.reduce((sum, c) => sum + (c.powerGenerated || 0), 0);
        totalPowerCons += sc.components.reduce((sum, c) => sum + (c.powerConsumed || 0), 0);
        totalCost += sc.components.reduce((sum, c) => sum + (c.cost || 0), 0);
        totalReliability *= sc.components.reduce((prod, c) => prod * (c.reliability || 1), 1);
      }
    });
    
    return { mass: totalMass, power: totalPowerGen - totalPowerCons, cost: totalCost, reliability: totalReliability * 100 };
  };

  const getValidationResults = (solution: DesignSolution): ValidationResult[] => {
    if (!requirements || requirements.length === 0) return [];
    return validateAllRequirements(requirements, solution);
  };

  const getValidationIcon = (status: 'PASS' | 'FAIL' | 'ERROR') => {
    switch (status) {
      case 'PASS': return <IconCheck size={16} color="#51cf66" />;
      case 'FAIL': return <IconX size={16} color="#ff6b6b" />;
      case 'ERROR': return <IconAlertTriangle size={16} color="#ffd43b" />;
    }
  };

  const getValidationColor = (status: 'PASS' | 'FAIL' | 'ERROR') => {
    switch (status) {
      case 'PASS': return 'green';
      case 'FAIL': return 'red';
      case 'ERROR': return 'yellow';
    }
  };

  const validateSolution = (solutionId: string) => {
    if (!requirements || requirements.length === 0) return;
    
    const reqText = requirements.map(r => `${r.title}: ${r.description}${r.aiHelperText ? ` (Helper: ${r.aiHelperText})` : ''}`).join('\n');
    const message = `Validate design solution ${solutionId} against these requirements:\n\n${reqText}\n\nSteps:\n1. Use get_mission_data to access the solution details\n2. For each requirement, validate using the helper text guidance\n3. Use save_validation_reports to persist the results\n\nProvide validation status (PASS/FAIL/ERROR), explanation, actual value, and required value for each requirement.`;
    
    window.dispatchEvent(new CustomEvent('openChatWithMessage', { 
      detail: { message, missionId } 
    }));
  };

  // Load existing validation reports on mount
  React.useEffect(() => {
    const loadValidationReports = async () => {
      if (!solutions) return;
      const reports: Record<string, any[]> = {};
      for (const solution of solutions) {
        const solutionReports = await missionAPI.getValidationReports(missionId, solution.id);
        if (solutionReports.length > 0) {
          reports[solution.id] = solutionReports;
        }
      }
      setValidationReports(reports);
    };
    loadValidationReports();
  }, [missionId, solutions]);

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="center">
        <Box>
          <Group align="center" gap="sm">
            <IconRocket size={24} color="#667eea" />
            <Title order={2} c="white">Design Solutions</Title>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            Complete spacecraft designs that meet your mission requirements
          </Text>
        </Box>
        <Group>
          <Button 
            leftSection={<IconWand size={18} />} 
            variant="gradient"
            gradient={{ from: '#667eea', to: '#764ba2' }}
            onClick={generateSolutions}
            size="lg"
            style={{
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
              transform: 'translateY(-1px)'
            }}
          >
            ✨ AI Generate
          </Button>
          <Button 
            leftSection={<IconPlus size={16} />} 
            variant="gradient"
            gradient={{ from: '#667eea', to: '#764ba2' }}
            size="md"
            disabled
          >
            Manual Design
          </Button>
        </Group>
      </Group>

      <Stack gap="lg">
        {(solutions || []).map((solution) => {
          const metrics = calculateMetrics(solution);
          const isExpanded = expandedSolutions.has(solution.id);
          
          return (
            <Card key={solution.id} className="glass-card-dark floating-card" padding="xl" radius="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Group align="center" gap="sm">
                      <Badge 
                        variant="gradient" 
                        gradient={{ from: '#667eea', to: '#764ba2' }}
                        size="lg"
                      >
                        {solution.label}
                      </Badge>
                      <Title order={3} c="white">{solution.name}</Title>
                    </Group>
                    
                    <Group gap="xs">
                      <Badge color={getStatusColor(solution.status)} size="sm">
                        {solution.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                      </Badge>
                      {solution.spacecraft && solution.spacecraft.length > 0 && (
                        <Badge color="cyan" size="sm" leftSection={<IconSatellite size={12} />}>
                          {solution.spacecraft.length} spacecraft
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                  
                  <Group>
                    <Button
                      size="sm"
                      variant="gradient"
                      gradient={{ from: '#51cf66', to: '#11998e' }}
                      leftSection={<IconShieldCheck size={16} />}
                      onClick={() => validateSolution(solution.id)}
                      disabled={!requirements || requirements.length === 0}
                    >
                      Validate
                    </Button>
                    <ActionIcon 
                      color="blue" 
                      variant="subtle" 
                      onClick={() => editSolution(solution)}
                      size="lg"
                    >
                      <IconEdit size={18} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="subtle" 
                      onClick={() => toggleExpanded(solution.id)}
                      size="lg"
                      c="white"
                    >
                      {isExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                    </ActionIcon>
                    <ActionIcon 
                      color="red" 
                      variant="subtle" 
                      onClick={() => deleteSolution(solution.id)}
                      size="lg"
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Group>

                {/* Key Metrics */}
                <Grid>
                  <Grid.Col span={3}>
                    <Card className="glass-card" p="md" radius="md">
                      <Group gap="xs" align="center">
                        <IconWeight size={16} color="#667eea" />
                        <Text size="xs" c="dimmed">MASS</Text>
                      </Group>
                      <Text size="lg" fw={600} c="white">{(metrics.mass || 0).toFixed(0)} kg</Text>
                    </Card>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Card className="glass-card" p="md" radius="md">
                      <Group gap="xs" align="center">
                        <IconBolt size={16} color="#11998e" />
                        <Text size="xs" c="dimmed">POWER</Text>
                      </Group>
                      <Text size="lg" fw={600} c="white">{(metrics.power || 0).toFixed(0)} W</Text>
                    </Card>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Card className="glass-card" p="md" radius="md">
                      <Group gap="xs" align="center">
                        <IconCurrencyDollar size={16} color="#ffd43b" />
                        <Text size="xs" c="dimmed">COST</Text>
                      </Group>
                      <Text size="lg" fw={600} c="white">${((metrics.cost || 0) / 1000000).toFixed(1)}M</Text>
                    </Card>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Card className="glass-card" p="md" radius="md">
                      <Group gap="xs" align="center">
                        <IconSatellite size={16} color="#51cf66" />
                        <Text size="xs" c="dimmed">RELIABILITY</Text>
                      </Group>
                      <Text size="lg" fw={600} c="white">{(metrics.reliability || 0).toFixed(1)}%</Text>
                      <Progress value={metrics.reliability || 0} size="xs" mt="xs" />
                    </Card>
                  </Grid.Col>
                </Grid>

                {/* AI Validation Reports */}
                {validationReports[solution.id] && validationReports[solution.id].length > 0 && (
                  <Card className="glass-card" p="md" radius="md">
                    <Group justify="space-between" align="center" mb="md">
                      <Group align="center" gap="sm">
                        <Text fw={600} c="white" size="md">AI Validation Report</Text>
                        <Badge 
                          color={validationReports[solution.id].some(r => r.status === 'FAIL') ? 'red' : 
                                validationReports[solution.id].some(r => r.status === 'ERROR') ? 'yellow' : 'green'} 
                          size="sm"
                        >
                          {validationReports[solution.id].filter(r => r.status === 'PASS').length}/{validationReports[solution.id].length} PASS
                        </Badge>
                      </Group>
                    </Group>
                    
                    <Stack gap="md">
                      {validationReports[solution.id].map((report) => {
                        const requirement = requirements?.find(r => r.id === report.requirementId);
                        return (
                          <Card key={report.requirementId} className="glass-card-dark" p="sm" radius="md">
                            <Stack gap="xs">
                              <Group justify="space-between" align="center">
                                <Group align="center" gap="sm">
                                  {getValidationIcon(report.status)}
                                  <Text size="sm" fw={500} c="white">
                                    {requirement?.title || `Requirement ${report.requirementId}`}
                                  </Text>
                                </Group>
                                <Badge color={getValidationColor(report.status)} size="xs">
                                  {report.status}
                                </Badge>
                              </Group>
                              <Text size="xs" c="rgba(255,255,255,0.8)">
                                {report.explanation}
                              </Text>
                              {(report.actualValue || report.requiredValue) && (
                                <Group gap="md">
                                  {report.requiredValue && (
                                    <Text size="xs" c="dimmed">
                                      Required: <Text span c="white">{report.requiredValue}</Text>
                                    </Text>
                                  )}
                                  {report.actualValue && (
                                    <Text size="xs" c="dimmed">
                                      Actual: <Text span c={report.status === 'PASS' ? 'green' : 'red'}>{report.actualValue}</Text>
                                    </Text>
                                  )}
                                </Group>
                              )}
                            </Stack>
                          </Card>
                        );
                      })}
                    </Stack>
                  </Card>
                )}

                <Collapse in={isExpanded}>
                  <Box mt="md">
                    {solution.notes && (
                      <Card className="glass-card" p="md" radius="md" mb="md">
                        <Text size="sm" c="white">{solution.notes}</Text>
                      </Card>
                    )}
                    
                    <Tabs defaultValue="spacecraft" styles={{
                      root: { backgroundColor: 'transparent' },
                      list: { borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
                      tab: { 
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&[data-active]': { color: 'white', borderColor: '#667eea' },
                        '&:hover': { color: 'white' }
                      },
                      panel: { paddingTop: '1rem' }
                    }}>
                      <Tabs.List>
                        <Tabs.Tab value="spacecraft" leftSection={<IconSatellite size={16} />}>
                          Spacecraft
                        </Tabs.Tab>
                        {solution.orbit && (
                          <Tabs.Tab value="orbit" leftSection={<IconPlanet size={16} />}>
                            Orbit
                          </Tabs.Tab>
                        )}
                        {solution.groundStations && solution.groundStations.length > 0 && (
                          <Tabs.Tab value="ground" leftSection={<IconWorld size={16} />}>
                            Ground Stations
                          </Tabs.Tab>
                        )}
                      </Tabs.List>

                      <Tabs.Panel value="spacecraft">
                        {solution.spacecraft && solution.spacecraft.length > 0 && (
                          <Box>
                            <Title order={4} c="white" mb="md">Spacecraft ({solution.spacecraft.length})</Title>
                            <Stack gap="lg">
                              {solution.spacecraft.map((spacecraft) => {
                                const isSpacecraftExpanded = expandedSpacecraft.has(spacecraft.id);
                                return (
                                <Card key={spacecraft.id} className="glass-card" p="md" radius="md">
                                  <Stack gap="md">
                                    <Group justify="space-between">
                                      <Group align="center" gap="sm">
                                        <Title order={5} c="white">{spacecraft.name}</Title>
                                        <Badge color="violet" size="sm">
                                          {(spacecraft.components || []).length} components
                                        </Badge>
                                      </Group>
                                      <ActionIcon 
                                        variant="subtle" 
                                        onClick={() => toggleSpacecraftExpanded(spacecraft.id)}
                                        size="sm"
                                        c="white"
                                      >
                                        {isSpacecraftExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                                      </ActionIcon>
                                    </Group>
                                    <Collapse in={isSpacecraftExpanded}>
                                      <Stack gap="md">
                                        {(spacecraft.components || []).map((component) => (
                                        <Card key={component.id} className="glass-card-dark" p="md" radius="md">
                                  <Stack gap="md">
                                    <Group justify="space-between">
                                      <Box>
                                        <Text fw={600} c="white" size="md">{component.name}</Text>
                                        <Text size="xs" c="dimmed" mt="xs">{component.description || 'No description available'}</Text>
                                      </Box>
                                      <Group>
                                        <Badge size="lg" color="blue">{component.type}</Badge>
                                        <ActionIcon 
                                          color="blue" 
                                          variant="subtle" 
                                          onClick={() => editComponent(component, solution.id)}
                                          size="sm"
                                        >
                                          <IconEdit size={14} />
                                        </ActionIcon>
                                      </Group>
                                    </Group>
                                    
                                    <Grid>
                                      <Grid.Col span={3}>
                                        <Text size="xs" c="dimmed">Mass</Text>
                                        <Text c="white" fw={500}>{component.mass || 0} kg</Text>
                                      </Grid.Col>
                                      <Grid.Col span={3}>
                                        <Text size="xs" c="dimmed">Power Consumed</Text>
                                        <Text c="white" fw={500}>{component.powerConsumed || 0} W</Text>
                                      </Grid.Col>
                                      <Grid.Col span={3}>
                                        <Text size="xs" c="dimmed">Power Generated</Text>
                                        <Text c="white" fw={500}>{component.powerGenerated || 0} W</Text>
                                      </Grid.Col>
                                      <Grid.Col span={3}>
                                        <Text size="xs" c="dimmed">TRL</Text>
                                        <Text c="white" fw={500}>{component.trl || 9}</Text>
                                      </Grid.Col>
                                    </Grid>
                                    
                                    <Grid>
                                      <Grid.Col span={4}>
                                        <Text size="xs" c="dimmed">Cost</Text>
                                        <Text c="white" fw={500}>${((component.cost || 0) / 1000000).toFixed(1)}M</Text>
                                      </Grid.Col>
                                      <Grid.Col span={4}>
                                        <Text size="xs" c="dimmed">Reliability</Text>
                                        <Text c="white" fw={500}>{((component.reliability || 1) * 100).toFixed(1)}%</Text>
                                      </Grid.Col>
                                      <Grid.Col span={4}>
                                        <Text size="xs" c="dimmed">Volume</Text>
                                        <Text c="white" fw={500}>{component.volume || 'N/A'} L</Text>
                                      </Grid.Col>
                                    </Grid>

                                    {component.type === 'payload' && (component.focalLength || component.spectralBands) && (
                                      <Card className="glass-card" p="sm" radius="md">
                                        <Text size="sm" fw={500} c="white" mb="xs">Payload Specifications</Text>
                                        <Grid>
                                          {component.focalLength && (
                                            <Grid.Col span={3}>
                                              <Text size="xs" c="dimmed">Focal Length</Text>
                                              <Text c="white" size="xs">{component.focalLength} m</Text>
                                            </Grid.Col>
                                          )}
                                          {component.apertureDiameter && (
                                            <Grid.Col span={3}>
                                              <Text size="xs" c="dimmed">Aperture</Text>
                                              <Text c="white" size="xs">{component.apertureDiameter} m</Text>
                                            </Grid.Col>
                                          )}
                                          {component.groundSampleDistance && (
                                            <Grid.Col span={3}>
                                              <Text size="xs" c="dimmed">GSD</Text>
                                              <Text c="white" size="xs">{component.groundSampleDistance} m</Text>
                                            </Grid.Col>
                                          )}
                                          {(component as any).groundSampleDistance_multispectral && (
                                            <Grid.Col span={3}>
                                              <Text size="xs" c="dimmed">GSD (Multi)</Text>
                                              <Text c="white" size="xs">{(component as any).groundSampleDistance_multispectral} m</Text>
                                            </Grid.Col>
                                          )}
                                          {(component as any).signalToNoiseRatio && (
                                            <Grid.Col span={3}>
                                              <Text size="xs" c="dimmed">SNR</Text>
                                              <Text c="white" size="xs">{(component as any).signalToNoiseRatio}</Text>
                                            </Grid.Col>
                                          )}
                                          {component.swathWidth && (
                                            <Grid.Col span={3}>
                                              <Text size="xs" c="dimmed">Swath Width</Text>
                                              <Text c="white" size="xs">{component.swathWidth} km</Text>
                                            </Grid.Col>
                                          )}
                                        </Grid>
                                        {component.spectralBands && component.spectralBands.length > 0 && (
                                          <Box mt="xs">
                                            <Text size="xs" c="dimmed" mb="xs">Spectral Bands</Text>
                                            <Group gap="xs">
                                              {component.spectralBands.map((band: any, idx: number) => (
                                                <Badge key={idx} size="xs" color="cyan">
                                                  {band.name}: {band.centerWavelength}nm
                                                </Badge>
                                              ))}
                                            </Group>
                                          </Box>
                                        )}
                                      </Card>
                                    )}

                                    {component.type === 'power' && (component.batteryCapacity || component.solarArrayArea) && (
                                      <Card className="glass-card" p="sm" radius="md">
                                        <Text size="sm" fw={500} c="white" mb="xs">Power Specifications</Text>
                                        <Grid>
                                          {component.batteryCapacity && (
                                            <Grid.Col span={4}>
                                              <Text size="xs" c="dimmed">Battery Capacity</Text>
                                              <Text c="white" size="xs">{component.batteryCapacity} Wh</Text>
                                            </Grid.Col>
                                          )}
                                          {component.solarArrayArea && (
                                            <Grid.Col span={4}>
                                              <Text size="xs" c="dimmed">Solar Array Area</Text>
                                              <Text c="white" size="xs">{component.solarArrayArea} m²</Text>
                                            </Grid.Col>
                                          )}
                                          {component.solarArrayEfficiency && (
                                            <Grid.Col span={4}>
                                              <Text size="xs" c="dimmed">Solar Efficiency</Text>
                                              <Text c="white" size="xs">{component.solarArrayEfficiency}%</Text>
                                            </Grid.Col>
                                          )}
                                        </Grid>
                                      </Card>
                                    )}

                                    {component.type === 'avionics' && (component.processingPower || component.memoryCapacity) && (
                                      <Card className="glass-card" p="sm" radius="md">
                                        <Text size="sm" fw={500} c="white" mb="xs">Avionics Specifications</Text>
                                        <Grid>
                                          {component.processingPower && (
                                            <Grid.Col span={4}>
                                              <Text size="xs" c="dimmed">Processing Power</Text>
                                              <Text c="white" size="xs">{component.processingPower} MIPS</Text>
                                            </Grid.Col>
                                          )}
                                          {component.memoryCapacity && (
                                            <Grid.Col span={4}>
                                              <Text size="xs" c="dimmed">Memory</Text>
                                              <Text c="white" size="xs">{component.memoryCapacity} GB</Text>
                                            </Grid.Col>
                                          )}
                                          {component.storageCapacity && (
                                            <Grid.Col span={4}>
                                              <Text size="xs" c="dimmed">Storage</Text>
                                              <Text c="white" size="xs">{component.storageCapacity} GB</Text>
                                            </Grid.Col>
                                          )}
                                        </Grid>
                                      </Card>
                                    )}
                                  </Stack>
                                </Card>
                                        ))}
                                      </Stack>
                                    </Collapse>
                                  </Stack>
                                </Card>
                                );
                              })}
                            </Stack>
                          </Box>
                        )}
                      </Tabs.Panel>

                      {solution.orbit && (
                        <Tabs.Panel value="orbit">
                          <Box>
                            <Group justify="space-between" align="center" mb="md">
                              <Title order={4} c="white">Orbital Parameters</Title>
                              <ActionIcon 
                                color="blue" 
                                variant="subtle" 
                                onClick={() => editOrbit(solution.orbit!, solution.id)}
                                size="sm"
                              >
                                <IconEdit size={14} />
                              </ActionIcon>
                            </Group>
                            <Card className="glass-card" p="md" radius="md">
                              <Grid>
                                <Grid.Col span={3}>
                                  <Text size="xs" c="dimmed">Name</Text>
                                  <Text c="white">{solution.orbit.name}</Text>
                                </Grid.Col>
                                <Grid.Col span={3}>
                                  <Text size="xs" c="dimmed">Altitude</Text>
                                  <Text c="white">{solution.orbit.altitude} km</Text>
                                </Grid.Col>
                                <Grid.Col span={3}>
                                  <Text size="xs" c="dimmed">Inclination</Text>
                                  <Text c="white">{solution.orbit.inclination}°</Text>
                                </Grid.Col>
                                <Grid.Col span={3}>
                                  <Text size="xs" c="dimmed">Period</Text>
                                  <Text c="white">{(solution.orbit.period || 0).toFixed(1)} min</Text>
                                </Grid.Col>
                              </Grid>
                              <Grid mt="md">
                                <Grid.Col span={6}>
                                  <Text size="xs" c="dimmed">Eccentricity</Text>
                                  <Text c="white">{solution.orbit.eccentricity || 0}</Text>
                                </Grid.Col>
                                <Grid.Col span={6}>
                                  <Text size="xs" c="dimmed">Notes</Text>
                                  <Text c="white" size="sm">{solution.orbit.notes || 'No additional notes'}</Text>
                                </Grid.Col>
                              </Grid>
                            </Card>
                          </Box>
                        </Tabs.Panel>
                      )}

                      {solution.groundStations && solution.groundStations.length > 0 && (
                        <Tabs.Panel value="ground">
                          <Box>
                            <Title order={4} c="white" mb="md">Ground Stations</Title>
                            <Stack gap="md">
                              {solution.groundStations.map((station) => (
                                <Card key={station.id} className="glass-card" p="md" radius="md">
                                  <Stack gap="sm">
                                    <Group justify="space-between">
                                      <Group>
                                        <Text fw={600} c="white" size="md">{station.name}</Text>
                                        <Badge color="green" size="sm">{station.location}</Badge>
                                      </Group>
                                      <ActionIcon 
                                        color="blue" 
                                        variant="subtle" 
                                        onClick={() => editGroundStation(station, solution.id)}
                                        size="sm"
                                      >
                                        <IconEdit size={14} />
                                      </ActionIcon>
                                    </Group>
                                    <Grid>
                                      <Grid.Col span={3}>
                                        <Text size="xs" c="dimmed">Coordinates</Text>
                                        <Text c="white" size="sm">{station.latitude.toFixed(2)}°, {station.longitude.toFixed(2)}°</Text>
                                      </Grid.Col>
                                      <Grid.Col span={3}>
                                        <Text size="xs" c="dimmed">Max Data Rate</Text>
                                        <Text c="white" size="sm">{station.maxDataRate} Mbps</Text>
                                      </Grid.Col>
                                      <Grid.Col span={3}>
                                        <Text size="xs" c="dimmed">Monthly Fee</Text>
                                        <Text c="white" size="sm">${(station.monthlyFee / 1000).toFixed(0)}K</Text>
                                      </Grid.Col>
                                      <Grid.Col span={3}>
                                        <Text size="xs" c="dimmed">Elevation Mask</Text>
                                        <Text c="white" size="sm">{station.elevationMask}°</Text>
                                      </Grid.Col>
                                    </Grid>
                                    {station.notes && (
                                      <Text c="dimmed" size="xs" mt="xs">{station.notes}</Text>
                                    )}
                                  </Stack>
                                </Card>
                              ))}
                            </Stack>
                          </Box>
                        </Tabs.Panel>
                      )}
                    </Tabs>
                  </Box>
                </Collapse>
              </Stack>
            </Card>
          );
        })}
      </Stack>

      {(solutions || []).length === 0 && (
        <Card className="glass-card" padding="xl" radius="lg" style={{ textAlign: 'center' }}>
          <Stack align="center" gap="md">
            <IconRocket size={48} color="rgba(255, 255, 255, 0.3)" />
            <Title order={3} c="white">No design solutions yet</Title>
            <Text c="dimmed" size="md">
              Generate complete spacecraft designs based on your objectives and requirements
            </Text>
          </Stack>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        opened={!!editingSolution}
        onClose={() => setEditingSolution(null)}
        title="Edit Design Solution"
        size="lg"
        styles={{
          content: { backgroundColor: 'rgba(26, 27, 35, 0.95)' },
          header: { backgroundColor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
          title: { color: 'white', fontWeight: 600 }
        }}
      >
        {editingSolution && (
          <Stack gap="md">
            <TextInput
              label="Solution Name"
              value={editingSolution.name}
              onChange={(e) => setEditingSolution({ ...editingSolution, name: e.target.value })}
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
              label="Label"
              value={editingSolution.label}
              onChange={(e) => setEditingSolution({ ...editingSolution, label: e.target.value })}
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
              label="Status"
              value={editingSolution.status}
              onChange={(value: string | null) => setEditingSolution({ ...editingSolution, status: value as any || 'proposed' })}
              data={[
                { value: 'proposed', label: '🔵 Proposed' },
                { value: 'under_evaluation', label: '🟡 Under Evaluation' },
                { value: 'selected', label: '🟢 Selected' },
                { value: 'rejected', label: '🔴 Rejected' }
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
            <Textarea
              label="Notes"
              value={editingSolution.notes || ''}
              onChange={(e) => setEditingSolution({ ...editingSolution, notes: e.target.value })}
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
            <Group>
              <Button onClick={saveEditedSolution} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Changes
              </Button>
              <Button variant="subtle" color="red" onClick={() => setEditingSolution(null)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Component Edit Modal */}
      <Modal
        opened={!!editingComponent}
        onClose={() => setEditingComponent(null)}
        title="Edit Component"
        size="lg"
        styles={{
          content: { backgroundColor: 'rgba(26, 27, 35, 0.95)' },
          header: { backgroundColor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
          title: { color: 'white', fontWeight: 600 }
        }}
      >
        {editingComponent && (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Component Name"
                  value={editingComponent.component.name}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    component: { ...editingComponent.component, name: e.target.value } as Component
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Type"
                  value={editingComponent.component.type}
                  onChange={(value: string | null) => setEditingComponent({
                    ...editingComponent,
                    component: { ...editingComponent.component, type: value as ComponentType } as Component
                  })}
                  data={[
                    { value: 'payload', label: 'Payload' },
                    { value: 'power', label: 'Power' },
                    { value: 'avionics', label: 'Avionics' },
                    { value: 'adcs', label: 'ADCS' },
                    { value: 'communications', label: 'Communications' },
                    { value: 'structure', label: 'Structure' },
                    { value: 'thermal', label: 'Thermal' },
                    { value: 'propulsion', label: 'Propulsion' }
                  ]}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={4}>
                <NumberInput
                  label="Mass (kg)"
                  value={editingComponent.component.mass}
                  onChange={(value) => setEditingComponent({
                    ...editingComponent,
                    component: { ...editingComponent.component, mass: Number(value) || 0 } as Component
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Power Consumed (W)"
                  value={editingComponent.component.powerConsumed}
                  onChange={(value) => setEditingComponent({
                    ...editingComponent,
                    component: { ...editingComponent.component, powerConsumed: Number(value) || 0 } as Component
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Power Generated (W)"
                  value={editingComponent.component.powerGenerated}
                  onChange={(value) => setEditingComponent({
                    ...editingComponent,
                    component: { ...editingComponent.component, powerGenerated: Number(value) || 0 } as Component
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={4}>
                <NumberInput
                  label="Cost (USD)"
                  value={editingComponent.component.cost}
                  onChange={(value) => setEditingComponent({
                    ...editingComponent,
                    component: { ...editingComponent.component, cost: Number(value) || 0 } as Component
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="TRL (1-9)"
                  value={editingComponent.component.trl}
                  min={1}
                  max={9}
                  onChange={(value) => setEditingComponent({
                    ...editingComponent,
                    component: { ...editingComponent.component, trl: Number(value) || 9 } as Component
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Reliability (0-1)"
                  value={editingComponent.component.reliability}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(value) => setEditingComponent({
                    ...editingComponent,
                    component: { ...editingComponent.component, reliability: Number(value) || 1 } as Component
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
            </Grid>

            {editingComponent.component.type === 'payload' && (
              <Card className="glass-card" p="md" radius="md">
                <Text fw={500} c="white" mb="md">Payload Specifications</Text>
                <Grid>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Focal Length (m)"
                      value={editingComponent.component.focalLength || 0}
                      step={0.1}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, focalLength: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Aperture Diameter (m)"
                      value={editingComponent.component.apertureDiameter || 0}
                      step={0.01}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, apertureDiameter: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Ground Sample Distance (m)"
                      value={editingComponent.component.groundSampleDistance || 0}
                      step={0.1}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, groundSampleDistance: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Swath Width (km)"
                      value={editingComponent.component.swathWidth || 0}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, swathWidth: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                </Grid>
              </Card>
            )}

            {editingComponent.component.type === 'power' && (
              <Card className="glass-card" p="md" radius="md">
                <Text fw={500} c="white" mb="md">Power Specifications</Text>
                <Grid>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Battery Capacity (Wh)"
                      value={editingComponent.component.batteryCapacity || 0}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, batteryCapacity: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Solar Array Area (m²)"
                      value={editingComponent.component.solarArrayArea || 0}
                      step={0.1}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, solarArrayArea: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Solar Efficiency (%)"
                      value={editingComponent.component.solarArrayEfficiency || 0}
                      min={0}
                      max={100}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, solarArrayEfficiency: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                </Grid>
              </Card>
            )}

            {editingComponent.component.type === 'avionics' && (
              <Card className="glass-card" p="md" radius="md">
                <Text fw={500} c="white" mb="md">Avionics Specifications</Text>
                <Grid>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Processing Power (MIPS)"
                      value={editingComponent.component.processingPower || 0}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, processingPower: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Memory Capacity (GB)"
                      value={editingComponent.component.memoryCapacity || 0}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, memoryCapacity: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Storage Capacity (GB)"
                      value={editingComponent.component.storageCapacity || 0}
                      onChange={(value) => setEditingComponent({
                        ...editingComponent,
                        component: { ...editingComponent.component, storageCapacity: Number(value) || 0 } as Component
                      })}
                      styles={{
                        input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                        label: { color: 'white', fontWeight: 500 }
                      }}
                    />
                  </Grid.Col>
                </Grid>
              </Card>
            )}

            <Textarea
              label="Description"
              value={editingComponent.component.description || ''}
              onChange={(e) => setEditingComponent({
                ...editingComponent,
                component: { ...editingComponent.component, description: e.target.value } as Component
              })}
              rows={3}
              styles={{
                input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                label: { color: 'white', fontWeight: 500 }
              }}
            />

            <Group>
              <Button onClick={saveEditedComponent} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Component
              </Button>
              <Button variant="subtle" color="red" onClick={() => setEditingComponent(null)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Orbit Edit Modal */}
      <Modal
        opened={!!editingOrbit}
        onClose={() => setEditingOrbit(null)}
        title="Edit Orbit"
        size="lg"
        styles={{
          content: { backgroundColor: 'rgba(26, 27, 35, 0.95)' },
          header: { backgroundColor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
          title: { color: 'white', fontWeight: 600 }
        }}
      >
        {editingOrbit && (
          <Stack gap="md">
            <TextInput
              label="Orbit Name"
              value={editingOrbit.orbit.name}
              onChange={(e) => setEditingOrbit({
                ...editingOrbit,
                orbit: { ...editingOrbit.orbit, name: e.target.value }
              })}
              styles={{
                input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                label: { color: 'white', fontWeight: 500 }
              }}
            />
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Altitude (km)"
                  value={editingOrbit.orbit.altitude}
                  onChange={(value) => setEditingOrbit({
                    ...editingOrbit,
                    orbit: { ...editingOrbit.orbit, altitude: Number(value) || 0 }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Inclination (degrees)"
                  value={editingOrbit.orbit.inclination}
                  min={0}
                  max={180}
                  onChange={(value) => setEditingOrbit({
                    ...editingOrbit,
                    orbit: { ...editingOrbit.orbit, inclination: Number(value) || 0 }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
            </Grid>
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Eccentricity (0-1)"
                  value={editingOrbit.orbit.eccentricity}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(value) => setEditingOrbit({
                    ...editingOrbit,
                    orbit: { ...editingOrbit.orbit, eccentricity: Number(value) || 0 }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Period (minutes)"
                  value={editingOrbit.orbit.period}
                  onChange={(value) => setEditingOrbit({
                    ...editingOrbit,
                    orbit: { ...editingOrbit.orbit, period: Number(value) || 0 }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
            </Grid>
            <Textarea
              label="Notes"
              value={editingOrbit.orbit.notes}
              onChange={(e) => setEditingOrbit({
                ...editingOrbit,
                orbit: { ...editingOrbit.orbit, notes: e.target.value }
              })}
              rows={3}
              styles={{
                input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                label: { color: 'white', fontWeight: 500 }
              }}
            />
            <Group>
              <Button onClick={saveEditedOrbit} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Orbit
              </Button>
              <Button variant="subtle" color="red" onClick={() => setEditingOrbit(null)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Ground Station Edit Modal */}
      <Modal
        opened={!!editingGroundStation}
        onClose={() => setEditingGroundStation(null)}
        title="Edit Ground Station"
        size="lg"
        styles={{
          content: { backgroundColor: 'rgba(26, 27, 35, 0.95)' },
          header: { backgroundColor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
          title: { color: 'white', fontWeight: 600 }
        }}
      >
        {editingGroundStation && (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Station Name"
                  value={editingGroundStation.station.name}
                  onChange={(e) => setEditingGroundStation({
                    ...editingGroundStation,
                    station: { ...editingGroundStation.station, name: e.target.value }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Location"
                  value={editingGroundStation.station.location}
                  onChange={(e) => setEditingGroundStation({
                    ...editingGroundStation,
                    station: { ...editingGroundStation.station, location: e.target.value }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
            </Grid>
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Latitude (degrees)"
                  value={editingGroundStation.station.latitude}
                  min={-90}
                  max={90}
                  step={0.01}
                  onChange={(value) => setEditingGroundStation({
                    ...editingGroundStation,
                    station: { ...editingGroundStation.station, latitude: Number(value) || 0 }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Longitude (degrees)"
                  value={editingGroundStation.station.longitude}
                  min={-180}
                  max={180}
                  step={0.01}
                  onChange={(value) => setEditingGroundStation({
                    ...editingGroundStation,
                    station: { ...editingGroundStation.station, longitude: Number(value) || 0 }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
            </Grid>
            <Grid>
              <Grid.Col span={4}>
                <NumberInput
                  label="Max Data Rate (Mbps)"
                  value={editingGroundStation.station.maxDataRate}
                  onChange={(value) => setEditingGroundStation({
                    ...editingGroundStation,
                    station: { ...editingGroundStation.station, maxDataRate: Number(value) || 0 }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Monthly Fee (USD)"
                  value={editingGroundStation.station.monthlyFee}
                  onChange={(value) => setEditingGroundStation({
                    ...editingGroundStation,
                    station: { ...editingGroundStation.station, monthlyFee: Number(value) || 0 }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Elevation Mask (degrees)"
                  value={editingGroundStation.station.elevationMask}
                  min={0}
                  max={90}
                  onChange={(value) => setEditingGroundStation({
                    ...editingGroundStation,
                    station: { ...editingGroundStation.station, elevationMask: Number(value) || 0 }
                  })}
                  styles={{
                    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
            </Grid>
            <Textarea
              label="Notes"
              value={editingGroundStation.station.notes}
              onChange={(e) => setEditingGroundStation({
                ...editingGroundStation,
                station: { ...editingGroundStation.station, notes: e.target.value }
              })}
              rows={3}
              styles={{
                input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' },
                label: { color: 'white', fontWeight: 500 }
              }}
            />
            <Group>
              <Button onClick={saveEditedGroundStation} variant="gradient" gradient={{ from: '#11998e', to: '#38ef7d' }}>
                Save Station
              </Button>
              <Button variant="subtle" color="red" onClick={() => setEditingGroundStation(null)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default DesignSolutionsTab;