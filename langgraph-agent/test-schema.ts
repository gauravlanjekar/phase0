// Test script to demonstrate schema generation
import { generateZodSchemas, generateSchemaFromModels } from './schema-generator';

console.log('=== TESTING SCHEMA GENERATION ===\n');

// Test Zod schema generation
console.log('1. Generated Zod Schemas:');
try {
  const zodSchemas = generateZodSchemas();
  console.log('✓ Objective schema:', zodSchemas.objective._def.shape());
  console.log('✓ Requirement schema:', zodSchemas.requirement._def.shape());
  console.log('✓ Constraint schema:', zodSchemas.constraint._def.shape());
  console.log('✓ DesignSolution schema:', zodSchemas.designSolution._def.shape());
} catch (error) {
  console.error('✗ Zod schema generation failed:', error);
}

console.log('\n2. Generated JSON Schemas:');
try {
  const jsonSchemas = generateSchemaFromModels();
  console.log('✓ Objectives schema:', JSON.stringify(jsonSchemas.objectives, null, 2));
  console.log('✓ Requirements schema:', JSON.stringify(jsonSchemas.requirements, null, 2));
  console.log('✓ Constraints schema:', JSON.stringify(jsonSchemas.constraints, null, 2));
} catch (error) {
  console.error('✗ JSON schema generation failed:', error);
}

console.log('\n3. Testing Object Creation:');
try {
  const zodSchemas = generateZodSchemas();
  
  // Test creating an objective
  const testObjective = {
    id: 'test-123',
    title: 'Test Objective',
    description: 'A test objective description',
    priority: 'high',
    category: 'scientific',
    stakeholders: ['NASA', 'ESA'],
    notes: 'Test notes'
  };
  
  const validatedObjective = zodSchemas.objective.parse(testObjective);
  console.log('✓ Created valid objective:', validatedObjective);
  
} catch (error) {
  console.error('✗ Object creation failed:', error);
}