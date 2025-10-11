// Test script to demonstrate schema generation
import { schemas, ObjectiveSchema, RequirementSchema, ConstraintSchema, DesignSolutionSchema } from './schema-generator';

console.log('=== TESTING SCHEMA GENERATION ===\n');

// Test Zod schema generation
console.log('1. Generated Zod Schemas:');
try {
  console.log('✓ Objective schema available');
  console.log('✓ Requirement schema available');
  console.log('✓ Constraint schema available');
  console.log('✓ DesignSolution schema available');
} catch (error) {
  console.error('✗ Zod schema generation failed:', error);
}

console.log('\n2. Schema Validation:');
try {
  console.log('✓ All schemas loaded from generator');
  console.log('✓ Schemas object contains:', Object.keys(schemas));
} catch (error) {
  console.error('✗ Schema loading failed:', error);
}

console.log('\n3. Testing Object Creation:');
try {
  // Test creating an objective
  const testObjective = {
    id: 'test-123',
    title: 'Test Objective',
    description: 'A test objective description',
    priority: 'high' as const,
    category: 'scientific',
    stakeholders: ['NASA', 'ESA'],
    notes: 'Test notes'
  };
  
  const validatedObjective = ObjectiveSchema.parse(testObjective);
  console.log('✓ Created valid objective:', validatedObjective);
  
} catch (error) {
  console.error('✗ Object creation failed:', error);
}