import { DesignSolution, Requirement, ValidationResult } from '../types/models';
import { JSONPath } from 'jsonpath-plus';

export const validateRequirement = (requirement: Requirement, solution: DesignSolution): ValidationResult => {
  if (!requirement.validationFormula) {
    return {
      requirementId: requirement.id,
      status: 'ERROR',
      actualValues: {},
      requiredValues: {},
      formula: '',
      error: 'No validation formula defined'
    };
  }

  try {
    const { formula, variables } = requirement.validationFormula;
    const actualValues: Record<string, any> = {};
    
    // Extract values from solution using variable paths
    for (const [varName, varConfig] of Object.entries(variables)) {
      try {
        const path = typeof varConfig === 'string' ? varConfig : varConfig.path;
        const unit = typeof varConfig === 'string' ? '' : varConfig.unit;
        const rawValue = extractValueFromPath(solution, path);
        actualValues[varName] = { value: rawValue, unit };
      } catch (error) {
        return {
          requirementId: requirement.id,
          status: 'ERROR',
          actualValues,
          requiredValues: {},
          formula,
          error: `Failed to extract ${varName}: ${error}`
        };
      }
    }

    // Evaluate formula
    const result = evaluateFormula(formula, actualValues);
    
    return {
      requirementId: requirement.id,
      status: result ? 'PASS' : 'FAIL',
      actualValues,
      requiredValues: extractRequiredValues(formula),
      formula: substituteFormula(formula, actualValues)
    };
  } catch (error) {
    return {
      requirementId: requirement.id,
      status: 'ERROR',
      actualValues: {},
      requiredValues: {},
      formula: requirement.validationFormula.formula,
      error: `Validation error: ${error}`
    };
  }
};

const extractValueFromPath = (obj: any, path: string): any => {
  try {
    // Convert custom path format to JSONPath format
    let jsonPath = convertToJSONPath(path);
    
    const result = JSONPath({ path: jsonPath, json: obj });
    
    if (result.length === 0) {
      throw new Error(`No value found at path: ${path}`);
    }
    
    return result[0];
  } catch (error) {
    throw new Error(`Failed to extract value from path '${path}': ${error}`);
  }
};

const convertToJSONPath = (path: string): string => {
  // Convert custom path format to JSONPath
  // Example: "spacecraft[0].components.find(c => c.type === 'payload').groundSampleDistance"
  // Becomes: "$.spacecraft[0].components[?(@.type=='payload')].groundSampleDistance"
  
  let jsonPath = '$.' + path;
  
  // Replace find() operations with JSONPath filter expressions
  jsonPath = jsonPath.replace(
    /\.find\(c => c\.(\w+) === ['"]?(\w+)['"]?\)/g,
    '[?(@.$1=="$2")]'
  );
  
  // Replace find() operations without quotes
  jsonPath = jsonPath.replace(
    /\.find\(c => c\.(\w+) === (\w+)\)/g,
    '[?(@.$1=="$2")]'
  );
  
  return jsonPath;
};

const evaluateFormula = (formula: string, values: Record<string, any>): boolean => {
  // Simple formula evaluator - replace variables and evaluate
  let evaluatedFormula = formula;
  
  // Sort variable names by length (longest first) to avoid partial replacements
  const sortedVars = Object.entries(values).sort(([a], [b]) => b.length - a.length);
  
  for (const [varName, valueObj] of sortedVars) {
    // Extract numeric value, handling both old and new formats
    const numericValue = typeof valueObj === 'object' && valueObj.value !== undefined ? valueObj.value : valueObj;
    // Use word boundaries to avoid partial replacements
    evaluatedFormula = evaluatedFormula.replace(new RegExp(`\\b${varName}\\b`, 'g'), String(numericValue));
  }
  
  // Basic safety check - only allow numbers, operators, and parentheses
  if (!/^[\d\s+\-*/.()<=>&|!]+$/.test(evaluatedFormula)) {
    throw new Error('Invalid formula characters');
  }
  
  try {
    return Function(`"use strict"; return (${evaluatedFormula})`)();
  } catch (error) {
    throw new Error(`Formula evaluation failed: ${error}`);
  }
};

const substituteFormula = (formula: string, values: Record<string, any>): string => {
  let result = formula;
  // Sort variable names by length (longest first) to avoid partial replacements
  const sortedVars = Object.entries(values).sort(([a], [b]) => b.length - a.length);
  
  for (const [varName, valueObj] of sortedVars) {
    // Extract numeric value and unit, handling both old and new formats
    const numericValue = typeof valueObj === 'object' && valueObj.value !== undefined ? valueObj.value : valueObj;
    const unit = typeof valueObj === 'object' && valueObj.unit ? ` ${valueObj.unit}` : '';
    // Use word boundaries to avoid partial replacements
    result = result.replace(new RegExp(`\\b${varName}\\b`, 'g'), `${numericValue}${unit}`);
  }
  return result;
};

const extractRequiredValues = (formula: string): Record<string, any> => {
  const requirements: Record<string, any> = {};
  
  // Extract comparison values from formula
  const comparisons = formula.match(/(\w+)\s*(<=|>=|<|>|==)\s*([\d.]+)/g);
  if (comparisons) {
    comparisons.forEach(comp => {
      const match = comp.match(/(\w+)\s*(<=|>=|<|>|==)\s*([\d.]+)/);
      if (match) {
        const [, varName, operator, value] = match;
        requirements[varName] = `${operator}${value}`;
      }
    });
  }
  
  return requirements;
};

export const validateAllRequirements = (requirements: Requirement[], solution: DesignSolution): ValidationResult[] => {
  return requirements
    .filter(req => req.validationFormula)
    .map(req => validateRequirement(req, solution));
};