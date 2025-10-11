#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

// Simple schema generator that reads the models.ts file and extracts type information
// This is a lightweight alternative to the full TypeScript compiler approach

interface TypeInfo {
  name: string;
  properties: Record<string, PropertyInfo>;
  required: string[];
}

interface PropertyInfo {
  type: string;
  enum?: string[];
  items?: PropertyInfo;
  properties?: Record<string, PropertyInfo>;
  optional: boolean;
}

class SimpleSchemaGenerator {
  private modelsContent: string;

  constructor(modelsPath: string) {
    this.modelsContent = fs.readFileSync(modelsPath, 'utf-8');
  }

  generateSchemas(): TypeInfo[] {
    const interfaces = this.extractInterfaces();
    return interfaces.map(iface => this.processInterface(iface));
  }

  private extractInterfaces(): string[] {
    const interfaceRegex = /export interface (\w+) \{([^}]+)\}/g;
    const interfaces: string[] = [];
    let match;

    while ((match = interfaceRegex.exec(this.modelsContent)) !== null) {
      const name = match[1];
      // Skip utility interfaces
      if (!['LogData', 'MissionData', 'TimelineStep', 'MissionCreationProgress', 'ValidationResult'].includes(name)) {
        interfaces.push(match[0]);
      }
    }

    return interfaces;
  }

  private processInterface(interfaceStr: string): TypeInfo {
    const nameMatch = interfaceStr.match(/interface (\w+)/);
    const name = nameMatch![1];

    const properties: Record<string, PropertyInfo> = {};
    const required: string[] = [];

    // Extract properties
    const propertyRegex = /(\w+)(\?)?:\s*([^;]+);/g;
    let match;

    while ((match = propertyRegex.exec(interfaceStr)) !== null) {
      const propName = match[1];
      const isOptional = !!match[2];
      const typeStr = match[3].trim();

      const propInfo = this.parseType(typeStr);
      propInfo.optional = isOptional;
      
      properties[propName] = propInfo;
      
      if (!isOptional) {
        required.push(propName);
      }
    }

    return { name, properties, required };
  }

  private parseType(typeStr: string): PropertyInfo {
    // Handle arrays
    if (typeStr.endsWith('[]')) {
      const itemType = typeStr.slice(0, -2);
      return {
        type: 'array',
        items: this.parseType(itemType),
        optional: false
      };
    }

    // Handle Array<T>
    const arrayMatch = typeStr.match(/Array<(.+)>/);
    if (arrayMatch) {
      return {
        type: 'array',
        items: this.parseType(arrayMatch[1]),
        optional: false
      };
    }

    // Handle union types (enums)
    if (typeStr.includes('|')) {
      const values = typeStr.split('|').map(v => v.trim().replace(/'/g, ''));
      return {
        type: 'string',
        enum: values,
        optional: false
      };
    }

    // Handle Record types
    if (typeStr.startsWith('Record<')) {
      return {
        type: 'object',
        optional: false
      };
    }

    // Handle primitive types
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean'
    };

    return {
      type: typeMap[typeStr] || 'object',
      optional: false
    };
  }

  generateZodSchema(typeInfo: TypeInfo): string {
    const props = Object.entries(typeInfo.properties).map(([key, prop]) => {
      const zodType = this.mapToZodType(prop);
      return `  ${key}: ${zodType}${prop.optional ? '.optional()' : ''}`;
    }).join(',\n');

    return `export const ${typeInfo.name}Schema = z.object({\n${props}\n});`;
  }

  generateJsonSchema(typeInfo: TypeInfo): any {
    const properties: Record<string, any> = {};
    
    Object.entries(typeInfo.properties).forEach(([key, prop]) => {
      properties[key] = this.mapToJsonSchema(prop);
    });

    return {
      type: 'object',
      properties,
      required: typeInfo.required.length > 0 ? typeInfo.required : undefined
    };
  }

  private mapToZodType(prop: PropertyInfo): string {
    switch (prop.type) {
      case 'string':
        return prop.enum ? `z.enum([${prop.enum.map(e => `'${e}'`).join(', ')}])` : 'z.string()';
      case 'number':
        return 'z.number()';
      case 'boolean':
        return 'z.boolean()';
      case 'array':
        return `z.array(${this.mapToZodType(prop.items!)})`;
      case 'object':
        return 'z.record(z.string(), z.any())';
      default:
        return 'z.any()';
    }
  }

  private mapToJsonSchema(prop: PropertyInfo): any {
    switch (prop.type) {
      case 'string':
        return prop.enum ? { type: 'string', enum: prop.enum } : { type: 'string' };
      case 'number':
        return { type: 'number' };
      case 'boolean':
        return { type: 'boolean' };
      case 'array':
        return { type: 'array', items: this.mapToJsonSchema(prop.items!) };
      case 'object':
        return { type: 'object' };
      default:
        return { type: 'object' };
    }
  }
}

// Generate schemas
const generator = new SimpleSchemaGenerator(path.join(__dirname, '../src/types/models.ts'));
const typeInfos = generator.generateSchemas();

// Write Zod schemas
const zodContent = `import { z } from 'zod/v4';

// Auto-generated Zod schemas from models.ts
// DO NOT EDIT - Run 'npm run generate-schemas' to regenerate

${typeInfos.map(t => generator.generateZodSchema(t)).join('\n\n')}

export const schemas = {
${typeInfos.map(t => `  ${t.name}Schema`).join(',\n')}
};
`;

fs.writeFileSync(
  path.join(__dirname, '../langgraph-agent/generated-schemas.ts'),
  zodContent
);

// Write JSON schemas
const jsonSchemas = typeInfos.reduce((acc, t) => {
  acc[t.name] = generator.generateJsonSchema(t);
  return acc;
}, {} as Record<string, any>);

const jsonContent = `// Auto-generated JSON schemas from models.ts
// DO NOT EDIT - Run 'npm run generate-schemas' to regenerate

export const jsonSchemas = ${JSON.stringify(jsonSchemas, null, 2)};
`;

fs.writeFileSync(
  path.join(__dirname, '../langgraph-agent/generated-json-schemas.ts'),
  jsonContent
);

console.log(`✅ Generated schemas for: ${typeInfos.map(t => t.name).join(', ')}`);