// Unified TypeScript Models for Mission Admin App
// Shared across UI, API, and Agent

// Type Definitions
export type Priority = 'high' | 'medium' | 'low';
export type SolutionStatus = 'proposed' | 'under_evaluation' | 'selected' | 'rejected';
export type ComponentType = 'payload' | 'power_system' | 'adcs' | 'communications' | 'structure' | 'thermal' | 'propulsion' | 'platform_avionics' | 'payload_avionics';
export type ConstraintOperator = 'less_than' | 'greater_than' | 'equal_to' | 'between';
export type RequirementType = 'functional' | 'performance' | 'interface' | 'operational' | 'safety' | 'environmental';
export type ConstraintType = 'budget' | 'mass' | 'power' | 'volume' | 'schedule' | 'risk' | 'technology' | 'regulatory';

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
  manufacturer: string;
  heritage: string;
  trl: number; // Technology Readiness Level 1-9
  reliability: number; // 0-1
  operatingTemperatureMin: number; // Celsius
  operatingTemperatureMax: number; // Celsius
  notes: string;
}

export interface PayloadComponent extends Component {
  type: 'payload';
  focalLength?: number; // meters
  apertureDiameter?: number; // meters
  fNumber?: number;
  detectorType?: string; // CCD, CMOS, etc.
  detectorArraySize?: [number, number]; // [along-track, across-track]
  pixelPitch?: number; // micrometers
  groundSampleDistance?: number; // meters
  swathWidth?: number; // km
  signalToNoiseRatio?: number;
  radiometricResolution?: number; // bits
  spectralBands?: SpectralBand[];
  integrationTime?: number; // ms
  dutyCycle?: number; // percent
  dataRate?: number; // Mbps
}

export interface AvionicsComponent extends Component {
  type: 'adcs' | 'communications' | 'platform_avionics' | 'payload_avionics';
  processingPower?: number; // MIPS or FLOPS
  memoryCapacity?: number; // GB
  storageCapacity?: number; // GB
  dataRate?: number; // Mbps
  operatingSystem?: string;
  redundancy?: 'none' | 'cold' | 'warm' | 'hot';
}

export interface PowerComponent extends Component {
  type: 'power_system';
  batteryCapacity?: number; // Wh
  solarArrayArea?: number; // m²
  solarArrayEfficiency?: number; // percent
  powerRegulationEfficiency?: number; // percent
  batteryType?: string; // Li-ion, NiMH, etc.
  chargeCycles?: number;
}

export interface PropulsionComponent extends Component {
  type: 'propulsion';
  thrustLevel?: number; // N
  specificImpulse?: number; // seconds
  propellantMass?: number; // kg
  propellantType?: string;
  thrusterType?: string; // chemical, electric, cold gas
  deltaVCapability?: number; // m/s
}

export interface StructuralComponent extends Component {
  type: 'structure' | 'thermal';
  material?: string;
  thermalConductivity?: number; // W/m·K
  thermalCapacity?: number; // J/kg·K
  structuralLoad?: number; // N
  vibrationTolerance?: number; // g
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

export interface DesignSolution {
  id: string;
  name: string;
  label: string;
  status: SolutionStatus;
  spacecraft: Spacecraft | null;
  orbit: Orbit | null;
  groundStations: GroundStation[];
  notes: string;
  createdAt: string;
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
  rationale: '',
  is_negotiable: false
});

export const createComponent = (
  id: string,
  name: string,
  type: ComponentType,
  mass: number,
  powerGenerated: number,
  powerConsumed: number,
  cost: number
): Component => ({
  id,
  name,
  type,
  mass,
  powerGenerated,
  powerConsumed,
  cost,
  manufacturer: '',
  heritage: '',
  trl: 9,
  reliability: 0.99,
  operatingTemperatureMin: -40,
  operatingTemperatureMax: 85,
  notes: ''
});

export const createSpacecraft = (
  id: string,
  name: string,
  components: Component[] = []
): Spacecraft => ({
  id,
  name,
  components,
  dryMass: components.reduce((sum, c) => sum + c.mass, 0),
  totalPowerGenerated: components.reduce((sum, c) => sum + c.powerGenerated, 0),
  totalPowerConsumed: components.reduce((sum, c) => sum + c.powerConsumed, 0),
  totalCost: components.reduce((sum, c) => sum + c.cost, 0)
});

export const createOrbit = (
  id: string,
  name: string,
  altitude: number,
  inclination: number = 0,
  eccentricity: number = 0
): Orbit => ({
  id,
  name,
  altitude,
  inclination,
  eccentricity,
  period: Math.sqrt(Math.pow(6371 + altitude, 3) / 398600.4418) * 2 * Math.PI / 60,
  notes: ''
});

export const createGroundStation = (
  id: string,
  name: string,
  location: string,
  latitude: number,
  longitude: number
): GroundStation => ({
  id,
  name,
  location,
  latitude,
  longitude,
  monthlyFee: 10000,
  maxDataRate: 100,
  elevationMask: 5,
  notes: ''
});

export const createDesignSolution = (
  id: string,
  name: string,
  label: string = 'Baseline'
): DesignSolution => ({
  id,
  name,
  label,
  status: 'proposed',
  spacecraft: null,
  orbit: null,
  groundStations: [],
  notes: '',
  createdAt: new Date().toISOString()
});