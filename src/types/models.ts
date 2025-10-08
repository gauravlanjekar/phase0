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
  notes: string;
}

export interface Requirement {
  id: string;
  title: string;
  type: RequirementType;
  description: string;
  priority: Priority;
  linkedObjectives: string[]; // Array of objective IDs
  validationFormula?: {
    formula: string;
    variables: Record<string, {
      path: string;
      unit: string;
    }>;
    description: string;
  };
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
  is_negotiable: boolean;
}

export interface Component {
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
  
  // Payload-specific properties
  focalLength?: number; // meters
  apertureDiameter?: number; // meters
  groundSampleDistance?: number; // meters
  swathWidth?: number; // km
  spectralBands?: SpectralBand[];
  detectorType?: string;
  radiometricResolution?: number; // bits
  dataRate?: number; // Mbps
  
  // Power system properties
  batteryCapacity?: number; // Wh
  solarArrayArea?: number; // m²
  solarArrayEfficiency?: number; // %
  batteryType?: string;
  chargeCycles?: number;
  
  // Avionics properties
  processingPower?: number; // MIPS
  memoryCapacity?: number; // GB
  storageCapacity?: number; // GB
  redundancy?: string;
  operatingSystem?: string;
}

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
export const createMission = (id: string, brief: string): Mission => ({
  id,
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
  stakeholders: [],
  notes: ''
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
  priority,
  linkedObjectives: []
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
  rationale: '',
  is_negotiable: false
});