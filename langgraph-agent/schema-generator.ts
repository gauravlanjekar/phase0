// Schema generator that dynamically reads from TypeScript models
import fs from 'fs';
import path from 'path';
import { z } from 'zod/v3';

// Read and parse TypeScript models
const modelsPath = path.resolve(process.cwd(), '../src/types/models.ts');
const modelsContent = fs.readFileSync(modelsPath, 'utf8');

// Extract enum values from TypeScript
const extractEnum = (enumName: string): string[] => {
  const enumRegex = new RegExp(`export type ${enumName} = ([^;]+);`);
  const match = modelsContent.match(enumRegex);
  if (match) {
    return match[1].split('|').map(s => s.trim().replace(/'/g, ''));
  }
  return [];
};

// Extract interface fields
const extractInterface = (interfaceName: string): Record<string, any> => {
  const interfaceRegex = new RegExp(`export interface ${interfaceName} \{([^}]+)\}`, 's');
  const match = modelsContent.match(interfaceRegex);
  if (!match) return {};
  
  const fields: Record<string, any> = {};
  const fieldLines = match[1].split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
  
  fieldLines.forEach(line => {
    const fieldMatch = line.match(/^\s*(\w+)(\?)?:\s*(.+);?$/);
    if (fieldMatch) {
      const [, fieldName, optional, fieldType] = fieldMatch;
      fields[fieldName] = {
        type: fieldType.trim(),
        optional: !!optional
      };
    }
  });
  
  return fields;
};

// Convert TypeScript type to Zod schema
const typeToZod = (fieldType: string, optional: boolean): any => {
  const baseType = fieldType.replace(/\[\]$/, '').replace(/\?$/, '');
  let zodType;
  
  if (fieldType.includes('[]')) {
    if (baseType === 'string') {
      zodType = z.array(z.string());
    } else if (baseType === 'number') {
      zodType = z.array(z.number());
    } else {
      zodType = z.array(z.record(z.any()));
    }
  } else if (baseType === 'string') {
    zodType = z.string();
  } else if (baseType === 'number') {
    zodType = z.number();
  } else if (baseType === 'boolean') {
    zodType = z.boolean();
  } else if (baseType.includes('|')) {
    const enumValues = baseType.split('|').map(v => v.trim().replace(/'/g, ''));
    zodType = z.enum(enumValues as [string, ...string[]]);
  } else {
    zodType = z.any();
  }
  
  return optional ? zodType.optional() : zodType;
};

// Generate Zod schemas dynamically from TypeScript interfaces
export const generateZodSchemas = (): any => {
  const objectiveFields = extractInterface('Objective');
  const requirementFields = extractInterface('Requirement');
  const constraintFields = extractInterface('Constraint');
  const designSolutionFields = extractInterface('DesignSolution');
  
  const buildZodObject = (fields: Record<string, any>) => {
    const zodFields: Record<string, any> = {};
    Object.entries(fields).forEach(([fieldName, fieldInfo]) => {
      zodFields[fieldName] = typeToZod(fieldInfo.type, fieldInfo.optional);
    });
    return z.object(zodFields);
  };
  
  return {
    objective: buildZodObject(objectiveFields),
    requirement: buildZodObject(requirementFields),
    constraint: buildZodObject(constraintFields),
    designSolution: buildZodObject(designSolutionFields)
  };
};

// Convert TypeScript type to JSON schema description
const typeToJsonSchema = (fieldType: string, optional: boolean): string => {
  const baseType = fieldType.replace(/\[\]$/, '').replace(/\?$/, '');
  let description;
  
  if (fieldType.includes('[]')) {
    description = `array of ${baseType}`;
  } else if (baseType === 'string') {
    description = 'string';
  } else if (baseType === 'number') {
    description = 'number';
  } else if (baseType === 'boolean') {
    description = 'boolean';
  } else if (baseType.includes('|')) {
    description = `string (${baseType.replace(/\s*\|\s*/g, '|')})`;
  } else {
    description = baseType;
  }
  
  return optional ? `${description} (optional)` : description;
};

// Generate JSON schema from TypeScript interfaces
export const generateSchemaFromModels = () => {
  const objectiveFields = extractInterface('Objective');
  const requirementFields = extractInterface('Requirement');
  const constraintFields = extractInterface('Constraint');
  const designSolutionFields = extractInterface('DesignSolution');
  
  const buildJsonSchema = (fields: Record<string, any>) => {
    const schema: Record<string, string> = {};
    Object.entries(fields).forEach(([fieldName, fieldInfo]) => {
      schema[fieldName] = typeToJsonSchema(fieldInfo.type, fieldInfo.optional);
    });
    return schema;
  };
  return {
    objectives: {
      type: 'array',
      items: {
        id: 'string (uuid)',
        title: 'string (concise objective title)',
        description: 'string (detailed description)',
        priority: 'string (high|medium|low)',
        category: 'string (scientific|operational|technical|commercial)',
        stakeholders: 'array of stakeholder names',
        notes: 'string (brief - 1-2 sentences max)'
      }
    },
    
    requirements: {
      type: 'array',
      items: {
        id: 'string (uuid)',
        title: 'string (concise requirement title)',
        description: 'string (detailed technical requirement)',
        type: 'string (performance|functional|interface|operational|safety|environmental)',
        priority: 'string (high|medium|low)',
        linkedObjectives: 'array of objective IDs',
        validationFormula: {
          formula: 'string (mathematical expression using variable names)',
          variables: 'object with variable definitions',
          description: 'string (what the formula validates)'
        }
      }
    },
    
    constraints: {
      type: 'array',
      items: {
        id: 'string (uuid)',
        title: 'string (constraint title)',
        constraint_type: 'string (budget|mass|power|volume|schedule|risk|technology|regulatory)',
        constraint: {
          operator: 'string (less_than|greater_than|equal_to|between)',
          value: 'number or [number, number] for between',
          unit: 'string (measurement unit)'
        },
        priority: 'string (high|medium|low)',
        rationale: 'string (why this constraint exists)',
        is_negotiable: 'boolean (whether constraint can be relaxed)'
      }
    },
    
    designSolutions: {
      type: 'array',
      items: {
        id: 'string (uuid)',
        name: 'string (solution name)',
        label: 'string (solution label like "Option A", "Baseline")',
        status: 'string (proposed|under_evaluation|selected|rejected)',
        spacecraft: {
          type: 'array',
          items: {
            id: 'string (uuid)',
            name: 'string (spacecraft name)',
            components: {
              type: 'array',
              items: {
                id: 'string (uuid)',
                name: 'string (component name)',
                type: 'string (payload|power|avionics|adcs|communications|structure|thermal|propulsion)',
                mass: 'number (kg)',
                powerGenerated: 'number (Watts, optional)',
                powerConsumed: 'number (Watts, optional)',
                cost: 'number (USD, optional)',
                manufacturer: 'string (optional)',
                heritage: 'string (optional)',
                trl: 'number (1-9, optional)',
                reliability: 'number (0-1, optional)',
                operatingTemperatureMin: 'number (Celsius, optional)',
                operatingTemperatureMax: 'number (Celsius, optional)',
                notes: 'string (optional)',
                description: 'string (optional)',
                volume: 'number (Liters, optional)',
                // Payload-specific
                focalLength: 'number (meters, for payload)',
                apertureDiameter: 'number (meters, for payload)',
                groundSampleDistance: 'number (meters, for payload)',
                swathWidth: 'number (km, for payload)',
                spectralBands: 'array of spectral band objects (for payload)',
                detectorType: 'string (for payload)',
                radiometricResolution: 'number (bits, for payload)',
                dataRate: 'number (Mbps, for payload/comms)',
                // Power-specific
                batteryCapacity: 'number (Wh, for power)',
                solarArrayArea: 'number (m², for power)',
                solarArrayEfficiency: 'number (%, for power)',
                batteryType: 'string (for power)',
                chargeCycles: 'number (for power)',
                // Avionics-specific
                processingPower: 'number (MIPS, for avionics)',
                memoryCapacity: 'number (GB, for avionics)',
                storageCapacity: 'number (GB, for avionics)',
                redundancy: 'string (for avionics)',
                operatingSystem: 'string (for avionics)'
              }
            },
            dryMass: 'number (kg, optional)',
            totalPowerGenerated: 'number (W, optional)',
            totalPowerConsumed: 'number (W, optional)',
            totalCost: 'number (USD, optional)'
          }
        },
        orbit: {
          id: 'string (uuid)',
          name: 'string (orbit name)',
          altitude: 'number (km)',
          inclination: 'number (degrees)',
          eccentricity: 'number (0-1)',
          period: 'number (minutes, optional)',
          notes: 'string (optional)'
        },
        groundStations: {
          type: 'array',
          items: {
            id: 'string (uuid)',
            name: 'string (station name)',
            location: 'string (location name)',
            latitude: 'number (degrees)',
            longitude: 'number (degrees)',
            monthlyFee: 'number (USD)',
            maxDataRate: 'number (Mbps)',
            elevationMask: 'number (degrees)',
            notes: 'string (optional)'
          }
        },
        notes: 'string (solution notes)',
        createdAt: 'string (ISO timestamp)'
      }
    }
  };
};