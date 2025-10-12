// Unified TypeScript Models for Mission Admin App
// Shared across UI, API, and Agent

// Type Definitions
export type Priority = 'high' | 'medium' | 'low';
export type SolutionStatus = 'proposed' | 'under_evaluation' | 'selected' | 'rejected';
export type ComponentType = 'payload' | 'power' | 'avionics' | 'adcs' | 'communications' | 'structure' | 'thermal' | 'propulsion';
export type ConstraintOperator = 'less_than' | 'greater_than' | 'equal_to' | 'between';
export type RequirementType = 'functional' | 'performance' | 'interface' | 'operational' | 'safety' | 'environmental';
export type ConstraintType = 'budget' | 'mass' | 'power' | 'volume' | 'schedule' | 'risk' | 'technology' | 'regulatory';
export type TimelineStepStatus = 'pending' | 'loading' | 'completed' | 'error';

export interface TimelineStep {
  id: string;
  title: string;
  description: string;
  status: TimelineStepStatus;
  error?: string;
}

// Interface Definitions
export interface Mission {
  id: string;
  name: string;
  brief: string;
  createdAt: string;
  updatedAt: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  category: string;
  stakeholders: string[];
  notes?: string;
}

export interface Requirement {
  id: string;
  title: string;
  type: RequirementType;
  description: string;
  priority: Priority;
  linkedObjectives?: string[]; // Array of objective IDs
  aiHelperText?: string;
}

export interface Constraint {
  id: string;
  title: string;
  constraint_type: ConstraintType;
  constraint: {
    operator: ConstraintOperator;
    value: number | [number, number];
    unit: string;
  };
  priority: Priority;
  rationale: string;
  is_negotiable?: boolean;
}

// Base component interface
export interface BaseComponent {
  id: string;
  name: string;
  type: ComponentType;
  mass: number; // kg
  powerGenerated: number; // Watts
  powerConsumed: number; // Watts
  cost: number; // USD
  manufacturer?: string;
  heritage?: string;
  trl: number; // Technology Readiness Level 1-9
  reliability: number; // 0-1
  operatingTemperatureMin?: number; // Celsius
  operatingTemperatureMax?: number; // Celsius
  notes?: string;
  description?: string;
  volume?: number; // Liters
}

// Payload component
export interface PayloadComponent extends BaseComponent {
  type: 'payload';
  focalLength?: number; // meters
  apertureDiameter?: number; // meters
  groundSampleDistance?: number; // meters
  groundSampleDistance_multispectral?: number; // meters
  swathWidth?: number; // km
  spectralBands?: SpectralBand[];
  detectorType?: string;
  radiometricResolution?: number; // bits
  dataRate?: number; // Mbps
  signalToNoiseRatio?: number;
  geolocationAccuracy?: number; // meters
  pointingAccuracy?: number; // degrees
  pointingStability?: number; // degrees/second
}

// Power component
export interface PowerComponent extends BaseComponent {
  type: 'power';
  batteryCapacity?: number; // Wh
  solarArrayArea?: number; // m²
  solarArrayEfficiency?: number; // %
  batteryType?: string;
  chargeCycles?: number;
}

// Avionics component
export interface AvionicsComponent extends BaseComponent {
  type: 'avionics';
  processingPower?: number; // MIPS
  memoryCapacity?: number; // GB
  storageCapacity?: number; // GB
  redundancy?: string;
  operatingSystem?: string;
}

// ADCS component
export interface AdcsComponent extends BaseComponent {
  type: 'adcs';
  pointingAccuracy?: number; // degrees
  pointingStability?: number; // degrees/second
  attitudeKnowledge?: number; // degrees
  slew_rate?: number; // degrees/second
}

// Communications component
export interface CommunicationsComponent extends BaseComponent {
  type: 'communications';
  dataRate?: number; // Mbps
  frequency?: number; // GHz
  antennaType?: string;
  antennaGain?: number; // dBi
  transmitPower?: number; // Watts
}

// Structure component
export interface StructureComponent extends BaseComponent {
  type: 'structure';
  material?: string;
  stiffness?: number; // N/m
  dampingRatio?: number;
}

// Thermal component
export interface ThermalComponent extends BaseComponent {
  type: 'thermal';
  heatDissipation?: number; // Watts
  thermalConductivity?: number; // W/mK
  operatingTemperatureRange?: [number, number]; // [min, max] Celsius
}

// Propulsion component
export interface PropulsionComponent extends BaseComponent {
  type: 'propulsion';
  propellantType?: string;
  specificImpulse?: number; // seconds
  thrust?: number; // Newtons
  propellantMass?: number; // kg
  deltaV?: number; // m/s
}

// Union type for all components
export type Component = 
  | PayloadComponent 
  | PowerComponent 
  | AvionicsComponent 
  | AdcsComponent 
  | CommunicationsComponent 
  | StructureComponent 
  | ThermalComponent 
  | PropulsionComponent;

export interface SpectralBand {
  name: string;
  centerWavelength: number; // nm
  bandwidth: number; // nm
  purpose: string;
}

export interface Spacecraft {
  id: string;
  name: string;
  components: Component[];
  dryMass: number;
  totalPowerGenerated: number;
  totalPowerConsumed: number;
  totalCost: number;
}

export interface Orbit {
  id: string;
  name: string;
  altitude: number; // km
  inclination: number; // degrees
  eccentricity: number;
  period: number; // minutes
  notes: string;
}

export interface GroundStation {
  id: string;
  name: string;
  location: string;
  latitude: number; // degrees
  longitude: number; // degrees
  monthlyFee: number; // USD
  maxDataRate: number; // Mbps
  elevationMask: number; // degrees
  notes: string;
}

export interface ValidationReport {
  requirementId: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  explanation: string;
  actualValue?: string;
  requiredValue?: string;
}

export interface ValidationResult {
  requirementId: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  actualValues: Record<string, any>;
  requiredValues: Record<string, any>;
  formula: string;
  error?: string;
}

export interface DesignSolution {
  id: string;
  name: string;
  label: string;
  status: SolutionStatus;
  spacecraft: Spacecraft[];
  orbit: Orbit | null;
  groundStations: GroundStation[];
  notes: string;
  createdAt: string;
}

export interface MissionCreationProgress {
  missionId: string;
  steps: TimelineStep[];
  currentStep: number;
  isComplete: boolean;
}

// Factory Functions
export const createMission = (id: string, name: string, brief: string): Mission => ({
  id,
  name,
  brief,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export const createObjective = (
  id: string, 
  title: string, 
  description: string, 
  priority: Priority = 'medium'
): Objective => ({
  id,
  title,
  description,
  priority,
  category: 'earth_observation',
  stakeholders: []
});

export const createRequirement = (
  id: string,
  title: string,
  type: RequirementType,
  description: string,
  priority: Priority = 'medium'
): Requirement => ({
  id,
  title,
  type,
  description,
  priority
});

export const createConstraint = (
  id: string,
  title: string,
  constraintType: ConstraintType,
  constraint: { operator: ConstraintOperator; value: number | [number, number]; unit: string },
  priority: Priority = 'medium'
): Constraint => ({
  id,
  title,
  constraint_type: constraintType,
  constraint,
  priority,
  rationale: ''
});

// Component factory functions
export const createPayloadComponent = (
  id: string,
  name: string,
  mass: number,
  powerConsumed: number,
  cost: number
): PayloadComponent => ({
  id,
  name,
  type: 'payload',
  mass,
  powerGenerated: 0,
  powerConsumed,
  cost,
  trl: 6,
  reliability: 0.9
});

export const createPowerComponent = (
  id: string,
  name: string,
  mass: number,
  powerGenerated: number,
  cost: number
): PowerComponent => ({
  id,
  name,
  type: 'power',
  mass,
  powerGenerated,
  powerConsumed: 0,
  cost,
  trl: 7,
  reliability: 0.9
});