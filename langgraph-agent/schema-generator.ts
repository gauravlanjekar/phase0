import { z } from 'zod/v4';

// Dynamic Zod schema generation from TypeScript models
// This ensures schemas stay in sync with the models.ts file

// Base type schemas
const PrioritySchema = z.enum(['high', 'medium', 'low']);
const SolutionStatusSchema = z.enum(['proposed', 'under_evaluation', 'selected', 'rejected']);
const ComponentTypeSchema = z.enum(['payload', 'power', 'avionics', 'adcs', 'communications', 'structure', 'thermal', 'propulsion']);
const ConstraintOperatorSchema = z.enum(['less_than', 'greater_than', 'equal_to', 'between']);
const RequirementTypeSchema = z.enum(['functional', 'performance', 'interface', 'operational', 'safety', 'environmental']);
const ConstraintTypeSchema = z.enum(['budget', 'mass', 'power', 'volume', 'schedule', 'risk', 'technology', 'regulatory']);

// Generated schemas matching models.ts interfaces
export const ObjectiveSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: PrioritySchema,
  category: z.string(),
  stakeholders: z.array(z.string()),
  notes: z.string().optional()
});

export const RequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: RequirementTypeSchema,
  description: z.string(),
  priority: PrioritySchema,
  linkedObjectives: z.array(z.string()).optional(),
  validationFormula: z.object({
    formula: z.string(),
    variables: z.record(z.string(), z.object({
      path: z.string(),
      unit: z.string()
    })),
    description: z.string().optional()
  }).optional()
});

export const ConstraintSchema = z.object({
  id: z.string(),
  title: z.string(),
  constraint_type: ConstraintTypeSchema,
  constraint: z.object({
    operator: ConstraintOperatorSchema,
    value: z.union([z.number(), z.array(z.number()).length(2)]),
    unit: z.string()
  }),
  priority: PrioritySchema,
  rationale: z.string(),
  is_negotiable: z.boolean().optional()
});

export const SpectralBandSchema = z.object({
  name: z.string(),
  centerWavelength: z.number(),
  bandwidth: z.number(),
  purpose: z.string()
});

// Base component schema
const BaseComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ComponentTypeSchema,
  mass: z.number(),
  powerGenerated: z.number(),
  powerConsumed: z.number(),
  cost: z.number(),
  manufacturer: z.string().optional(),
  heritage: z.string().optional(),
  trl: z.number().min(1).max(9),
  reliability: z.number().min(0).max(1),
  operatingTemperatureMin: z.number().optional(),
  operatingTemperatureMax: z.number().optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  volume: z.number().optional()
});

// Payload component schema
const PayloadComponentSchema = BaseComponentSchema.extend({
  type: z.literal('payload'),
  focalLength: z.number().optional(),
  apertureDiameter: z.number().optional(),
  groundSampleDistance: z.number().optional(),
  groundSampleDistance_multispectral: z.number().optional(),
  swathWidth: z.number().optional(),
  spectralBands: z.array(SpectralBandSchema).optional(),
  detectorType: z.string().optional(),
  radiometricResolution: z.number().optional(),
  dataRate: z.number().optional(),
  signalToNoiseRatio: z.number().optional(),
  geolocationAccuracy: z.number().optional(),
  pointingAccuracy: z.number().optional(),
  pointingStability: z.number().optional()
});

// Power component schema
const PowerComponentSchema = BaseComponentSchema.extend({
  type: z.literal('power'),
  batteryCapacity: z.number().optional(),
  solarArrayArea: z.number().optional(),
  solarArrayEfficiency: z.number().optional(),
  batteryType: z.string().optional(),
  chargeCycles: z.number().optional()
});

// Avionics component schema
const AvionicsComponentSchema = BaseComponentSchema.extend({
  type: z.literal('avionics'),
  processingPower: z.number().optional(),
  memoryCapacity: z.number().optional(),
  storageCapacity: z.number().optional(),
  redundancy: z.string().optional(),
  operatingSystem: z.string().optional()
});

// ADCS component schema
const AdcsComponentSchema = BaseComponentSchema.extend({
  type: z.literal('adcs'),
  pointingAccuracy: z.number().optional(),
  pointingStability: z.number().optional(),
  attitudeKnowledge: z.number().optional(),
  slew_rate: z.number().optional()
});

// Communications component schema
const CommunicationsComponentSchema = BaseComponentSchema.extend({
  type: z.literal('communications'),
  dataRate: z.number().optional(),
  frequency: z.number().optional(),
  antennaType: z.string().optional(),
  antennaGain: z.number().optional(),
  transmitPower: z.number().optional()
});

// Structure component schema
const StructureComponentSchema = BaseComponentSchema.extend({
  type: z.literal('structure'),
  material: z.string().optional(),
  stiffness: z.number().optional(),
  dampingRatio: z.number().optional()
});

// Thermal component schema
const ThermalComponentSchema = BaseComponentSchema.extend({
  type: z.literal('thermal'),
  heatDissipation: z.number().optional(),
  thermalConductivity: z.number().optional(),
  operatingTemperatureRange: z.array(z.number()).length(2).optional()
});

// Propulsion component schema
const PropulsionComponentSchema = BaseComponentSchema.extend({
  type: z.literal('propulsion'),
  propellantType: z.string().optional(),
  specificImpulse: z.number().optional(),
  thrust: z.number().optional(),
  propellantMass: z.number().optional(),
  deltaV: z.number().optional()
});

// Union schema for all component types
export const ComponentSchema = z.discriminatedUnion('type', [
  PayloadComponentSchema,
  PowerComponentSchema,
  AvionicsComponentSchema,
  AdcsComponentSchema,
  CommunicationsComponentSchema,
  StructureComponentSchema,
  ThermalComponentSchema,
  PropulsionComponentSchema
]);

export const SpacecraftSchema = z.object({
  id: z.string(),
  name: z.string(),
  components: z.array(ComponentSchema),
  dryMass: z.number(),
  totalPowerGenerated: z.number(),
  totalPowerConsumed: z.number(),
  totalCost: z.number()
});

export const OrbitSchema = z.object({
  id: z.string(),
  name: z.string(),
  altitude: z.number(),
  inclination: z.number(),
  eccentricity: z.number(),
  period: z.number(),
  notes: z.string()
});

export const GroundStationSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  monthlyFee: z.number(),
  maxDataRate: z.number(),
  elevationMask: z.number(),
  notes: z.string()
});

export const DesignSolutionSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  status: SolutionStatusSchema,
  spacecraft: z.array(SpacecraftSchema),
  orbit: OrbitSchema.nullable().optional(),
  groundStations: z.array(GroundStationSchema),
  notes: z.string(),
  createdAt: z.string()
});

// Export all schemas for use in tools
export const schemas = {
  ObjectiveSchema,
  RequirementSchema,
  ConstraintSchema,
  ComponentSchema,
  SpacecraftSchema,
  OrbitSchema,
  GroundStationSchema,
  DesignSolutionSchema
};