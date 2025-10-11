#!/usr/bin/env ts-node

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface SchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  optional?: boolean;
}

interface GeneratedSchema {
  name: string;
  jsonSchema: any;
  zodSchema: string;
}

class SchemaGenerator {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private sourceFile: ts.SourceFile;

  constructor(filePath: string) {
    this.program = ts.createProgram([filePath], {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    });
    this.checker = this.program.getTypeChecker();
    this.sourceFile = this.program.getSourceFile(filePath)!;
  }

  generateSchemas(): GeneratedSchema[] {
    const schemas: GeneratedSchema[] = [];
    
    // Visit all interface declarations
    ts.forEachChild(this.sourceFile, (node) => {
      if (ts.isInterfaceDeclaration(node)) {
        const schema = this.processInterface(node);
        if (schema) {
          schemas.push(schema);
        }
      }
    });

    return schemas;
  }

  private processInterface(node: ts.InterfaceDeclaration): GeneratedSchema | null {
    const name = node.name.text;
    
    // Skip utility interfaces
    if (['LogData', 'MissionData', 'TimelineStep', 'MissionCreationProgress', 'ValidationResult'].includes(name)) {
      return null;
    }

    const properties: Record<string, SchemaProperty> = {};
    const required: string[] = [];

    node.members.forEach((member) => {
      if (ts.isPropertySignature(member)) {
        const propName = (member.name as ts.Identifier).text;
        const isOptional = !!member.questionToken;
        
        const propSchema = this.processType(member.type!);
        if (propSchema) {
          properties[propName] = propSchema;
          if (!isOptional) {
            required.push(propName);
          }
        }
      }
    });

    const jsonSchema = {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };

    const zodSchema = this.generateZodSchema(name, properties, required);

    return {
      name,
      jsonSchema,
      zodSchema
    };
  }

  private processType(typeNode: ts.TypeNode): SchemaProperty | null {
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = (typeNode.typeName as ts.Identifier).text;
      
      // Handle arrays
      if (typeName === 'Array' && typeNode.typeArguments) {
        const itemType = this.processType(typeNode.typeArguments[0]);
        return itemType ? { type: 'array', items: itemType } : null;
      }
      
      // Handle custom types
      return this.mapCustomType(typeName);
    }
    
    if (ts.isArrayTypeNode(typeNode)) {
      const itemType = this.processType(typeNode.elementType);
      return itemType ? { type: 'array', items: itemType } : null;
    }
    
    if (ts.isUnionTypeNode(typeNode)) {
      // Handle string literal unions (enums)
      const literals = typeNode.types
        .filter(ts.isLiteralTypeNode)
        .map(node => (node.literal as ts.StringLiteral).text);
      
      if (literals.length > 0) {
        return { type: 'string', enum: literals };
      }
    }

    // Handle primitive types
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        return { type: 'string' };
      case ts.SyntaxKind.NumberKeyword:
        return { type: 'number' };
      case ts.SyntaxKind.BooleanKeyword:
        return { type: 'boolean' };
      default:
        return null;
    }
  }

  private mapCustomType(typeName: string): SchemaProperty | null {
    const typeMap: Record<string, SchemaProperty> = {
      'Priority': { type: 'string', enum: ['high', 'medium', 'low'] },
      'RequirementType': { type: 'string', enum: ['functional', 'performance', 'interface', 'operational', 'safety', 'environmental'] },
      'ConstraintType': { type: 'string', enum: ['budget', 'mass', 'power', 'volume', 'schedule', 'risk', 'technology', 'regulatory'] },
      'ConstraintOperator': { type: 'string', enum: ['less_than', 'greater_than', 'equal_to', 'between'] },
      'ComponentType': { type: 'string', enum: ['payload', 'power', 'avionics', 'adcs', 'communications', 'structure', 'thermal', 'propulsion'] },
      'SolutionStatus': { type: 'string', enum: ['proposed', 'under_evaluation', 'selected', 'rejected'] }
    };

    return typeMap[typeName] || { type: 'object' };
  }

  private generateZodSchema(name: string, properties: Record<string, SchemaProperty>, required: string[]): string {
    const props = Object.entries(properties).map(([key, prop]) => {
      const isRequired = required.includes(key);
      const zodType = this.mapToZodType(prop);
      return `  ${key}: ${zodType}${isRequired ? '' : '.optional()'}`;
    }).join(',\n');

    return `export const ${name}Schema = z.object({\n${props}\n});`;
  }

  private mapToZodType(prop: SchemaProperty): string {
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
}

// Generate schemas
const generator = new SchemaGenerator(path.join(__dirname, '../src/types/models.ts'));
const schemas = generator.generateSchemas();

// Write Zod schemas
const zodContent = `import { z } from 'zod/v4';

// Auto-generated Zod schemas from models.ts
// DO NOT EDIT - Run 'npm run generate-schemas' to regenerate

${schemas.map(s => s.zodSchema).join('\n\n')}

export const schemas = {
${schemas.map(s => `  ${s.name}Schema`).join(',\n')}
};
`;

fs.writeFileSync(
  path.join(__dirname, '../langgraph-agent/generated-schemas.ts'),
  zodContent
);

// Write JSON schemas for tools
const jsonSchemasContent = `// Auto-generated JSON schemas from models.ts
// DO NOT EDIT - Run 'npm run generate-schemas' to regenerate

export const jsonSchemas = {
${schemas.map(s => `  ${s.name}: ${JSON.stringify(s.jsonSchema, null, 2)}`).join(',\n')}
};
`;

fs.writeFileSync(
  path.join(__dirname, '../langgraph-agent/generated-json-schemas.ts'),
  jsonSchemasContent
);

console.log(`✅ Generated schemas for: ${schemas.map(s => s.name).join(', ')}`);