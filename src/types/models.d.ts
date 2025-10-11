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
    notes?: string;
}
export interface Requirement {
    id: string;
    title: string;
    type: RequirementType;
    description: string;
    priority: Priority;
    linkedObjectives?: string[];
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
export interface BaseComponent {
    id: string;
    name: string;
    type: ComponentType;
    mass: number;
    powerGenerated: number;
    powerConsumed: number;
    cost: number;
    manufacturer?: string;
    heritage?: string;
    trl: number;
    reliability: number;
    operatingTemperatureMin?: number;
    operatingTemperatureMax?: number;
    notes?: string;
    description?: string;
    volume?: number;
}
export interface PayloadComponent extends BaseComponent {
    type: 'payload';
    focalLength?: number;
    apertureDiameter?: number;
    groundSampleDistance?: number;
    groundSampleDistance_multispectral?: number;
    swathWidth?: number;
    spectralBands?: SpectralBand[];
    detectorType?: string;
    radiometricResolution?: number;
    dataRate?: number;
    signalToNoiseRatio?: number;
    geolocationAccuracy?: number;
    pointingAccuracy?: number;
    pointingStability?: number;
}
export interface PowerComponent extends BaseComponent {
    type: 'power';
    batteryCapacity?: number;
    solarArrayArea?: number;
    solarArrayEfficiency?: number;
    batteryType?: string;
    chargeCycles?: number;
}
export interface AvionicsComponent extends BaseComponent {
    type: 'avionics';
    processingPower?: number;
    memoryCapacity?: number;
    storageCapacity?: number;
    redundancy?: string;
    operatingSystem?: string;
}
export interface AdcsComponent extends BaseComponent {
    type: 'adcs';
    pointingAccuracy?: number;
    pointingStability?: number;
    attitudeKnowledge?: number;
    slew_rate?: number;
}
export interface CommunicationsComponent extends BaseComponent {
    type: 'communications';
    dataRate?: number;
    frequency?: number;
    antennaType?: string;
    antennaGain?: number;
    transmitPower?: number;
}
export interface StructureComponent extends BaseComponent {
    type: 'structure';
    material?: string;
    stiffness?: number;
    dampingRatio?: number;
}
export interface ThermalComponent extends BaseComponent {
    type: 'thermal';
    heatDissipation?: number;
    thermalConductivity?: number;
    operatingTemperatureRange?: [number, number];
}
export interface PropulsionComponent extends BaseComponent {
    type: 'propulsion';
    propellantType?: string;
    specificImpulse?: number;
    thrust?: number;
    propellantMass?: number;
    deltaV?: number;
}
export type Component = PayloadComponent | PowerComponent | AvionicsComponent | AdcsComponent | CommunicationsComponent | StructureComponent | ThermalComponent | PropulsionComponent;
export interface SpectralBand {
    name: string;
    centerWavelength: number;
    bandwidth: number;
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
    altitude: number;
    inclination: number;
    eccentricity: number;
    period: number;
    notes: string;
}
export interface GroundStation {
    id: string;
    name: string;
    location: string;
    latitude: number;
    longitude: number;
    monthlyFee: number;
    maxDataRate: number;
    elevationMask: number;
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
export declare const createMission: (id: string, brief: string) => Mission;
export declare const createObjective: (id: string, title: string, description: string, priority?: Priority) => Objective;
export declare const createRequirement: (id: string, title: string, type: RequirementType, description: string, priority?: Priority) => Requirement;
export declare const createConstraint: (id: string, title: string, constraintType: ConstraintType, constraint: {
    operator: ConstraintOperator;
    value: number | [number, number];
    unit: string;
}, priority?: Priority) => Constraint;
export declare const createPayloadComponent: (id: string, name: string, mass: number, powerConsumed: number, cost: number) => PayloadComponent;
export declare const createPowerComponent: (id: string, name: string, mass: number, powerGenerated: number, cost: number) => PowerComponent;
//# sourceMappingURL=models.d.ts.map