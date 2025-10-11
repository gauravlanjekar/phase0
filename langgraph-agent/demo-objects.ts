// Demo: How objects are generated from TypeScript models
import { generateZodSchemas } from './schema-generator';

const zodSchemas = generateZodSchemas();

// Create sample objects that match the TypeScript interfaces
const sampleObjective = {
  id: 'obj-001',
  title: 'Earth Observation Mission',
  description: 'Monitor climate change indicators',
  priority: 'high' as const,
  category: 'scientific' as const,
  stakeholders: ['NASA', 'NOAA'],
  notes: 'Critical for climate research'
};

const sampleRequirement = {
  id: 'req-001',
  title: 'Ground Sample Distance',
  description: 'Achieve 10m ground sample distance',
  type: 'performance' as const,
  priority: 'high' as const,
  linkedObjectives: ['obj-001'],
  validationFormula: {
    formula: 'altitude * pixelSize / focalLength',
    variables: { altitude: 500, pixelSize: 0.01, focalLength: 2.5 },
    description: 'Calculate ground sample distance'
  }
};

const sampleConstraint = {
  id: 'con-001',
  title: 'Mass Budget',
  constraint_type: 'mass' as const,
  constraint: {
    operator: 'less_than' as const,
    value: 500,
    unit: 'kg'
  },
  priority: 'high' as const,
  rationale: 'Launch vehicle capacity limit',
  is_negotiable: false
};

// Validate objects using generated Zod schemas
console.log('=== OBJECT VALIDATION DEMO ===\n');

try {
  const validObjective = zodSchemas.objective.parse(sampleObjective);
  console.log('✓ Valid Objective:', validObjective);
} catch (error) {
  console.error('✗ Invalid Objective:', error);
}

try {
  const validRequirement = zodSchemas.requirement.parse(sampleRequirement);
  console.log('✓ Valid Requirement:', validRequirement);
} catch (error) {
  console.error('✗ Invalid Requirement:', error);
}

try {
  const validConstraint = zodSchemas.constraint.parse(sampleConstraint);
  console.log('✓ Valid Constraint:', validConstraint);
} catch (error) {
  console.error('✗ Invalid Constraint:', error);
}

// Test invalid object
console.log('\n=== TESTING VALIDATION ===');
try {
  const invalidObjective = { id: 'test', title: 123 }; // title should be string
  zodSchemas.objective.parse(invalidObjective);
} catch (error) {
  console.log('✓ Validation caught invalid data:', (error as Error).message);
}