// Solution Validation Utility for Node.js
const ValidationStatus = {
  PASS: 'pass',
  FAIL: 'fail',
  WARNING: 'warning',
  NOT_APPLICABLE: 'not_applicable'
};

const validateSolution = (solution, constraints) => {
  if (!solution || !constraints) return [];
  
  const results = [];
  constraints.forEach(constraint => {
    const result = validateConstraint(solution, constraint);
    results.push(result);
  });
  
  return results;
};

const validateConstraint = (solution, constraint) => {
  const { constraint_type, constraint: constraintObj, title, id } = constraint;
  const { operator, value, unit } = constraintObj || {};
  
  let actualValue = null;
  let status = ValidationStatus.NOT_APPLICABLE;
  let message = '';
  
  try {
    switch (constraint_type) {
      case 'budget':
        actualValue = calculateTotalCost(solution);
        ({ status, message } = checkNumericConstraint(actualValue, operator, value, unit, 'Total Cost'));
        break;
        
      case 'mass':
        actualValue = calculateTotalMass(solution);
        ({ status, message } = checkNumericConstraint(actualValue, operator, value, unit, 'Total Mass'));
        break;
        
      case 'power':
        if (title.toLowerCase().includes('consumption') || title.toLowerCase().includes('consumed')) {
          actualValue = calculateTotalPowerConsumed(solution);
          ({ status, message } = checkNumericConstraint(actualValue, operator, value, unit, 'Power Consumed'));
        } else if (title.toLowerCase().includes('generation') || title.toLowerCase().includes('generated')) {
          actualValue = calculateTotalPowerGenerated(solution);
          ({ status, message } = checkNumericConstraint(actualValue, operator, value, unit, 'Power Generated'));
        } else {
          // Default to net power (generated - consumed)
          actualValue = calculateNetPower(solution);
          ({ status, message } = checkNumericConstraint(actualValue, operator, value, unit, 'Net Power'));
        }
        break;
        
      case 'orbital':
        const orbitResult = validateOrbitalConstraint(solution, constraint);
        actualValue = orbitResult.actualValue;
        status = orbitResult.status;
        message = orbitResult.message;
        break;
        
      default:
        status = ValidationStatus.NOT_APPLICABLE;
        message = `Constraint type '${constraint_type}' not supported`;
    }
  } catch (error) {
    status = ValidationStatus.WARNING;
    message = `Validation error: ${error.message}`;
  }
  
  return {
    constraintId: id,
    constraintTitle: title,
    constraintType: constraint_type,
    operator,
    expectedValue: value,
    actualValue,
    unit,
    status,
    message
  };
};

const checkNumericConstraint = (actualValue, operator, expectedValue, unit, label) => {
  if (actualValue === null || actualValue === undefined) {
    return {
      status: ValidationStatus.WARNING,
      message: `${label} could not be calculated`
    };
  }
  
  let passes = false;
  let operatorText = '';
  
  switch (operator) {
    case '<=':
      passes = actualValue <= expectedValue;
      operatorText = '≤';
      break;
    case '>=':
      passes = actualValue >= expectedValue;
      operatorText = '≥';
      break;
    case '==':
      passes = Math.abs(actualValue - expectedValue) < 0.01;
      operatorText = '=';
      break;
    case '<':
      passes = actualValue < expectedValue;
      operatorText = '<';
      break;
    case '>':
      passes = actualValue > expectedValue;
      operatorText = '>';
      break;
    case 'between':
      if (Array.isArray(expectedValue) && expectedValue.length === 2) {
        passes = actualValue >= expectedValue[0] && actualValue <= expectedValue[1];
        operatorText = 'between';
      }
      break;
    default:
      return {
        status: ValidationStatus.WARNING,
        message: `Unknown operator: ${operator}`
      };
  }
  
  const status = passes ? ValidationStatus.PASS : ValidationStatus.FAIL;
  const expectedText = operator === 'between' 
    ? `${expectedValue[0]} - ${expectedValue[1]} ${unit}`
    : `${operatorText} ${expectedValue} ${unit}`;
  
  const message = `${label}: ${actualValue.toFixed(2)} ${unit} (expected ${expectedText})`;
  
  return { status, message };
};

const validateOrbitalConstraint = (solution, constraint) => {
  const { constraint: constraintObj, title } = constraint;
  const { operator, value, unit } = constraintObj || {};
  
  if (!solution.orbit) {
    return {
      actualValue: null,
      status: ValidationStatus.WARNING,
      message: 'No orbit defined for solution'
    };
  }
  
  let actualValue = solution.orbit.altitude;
  let label = 'Altitude';
  
  if (title.toLowerCase().includes('inclination')) {
    actualValue = solution.orbit.inclination;
    label = 'Inclination';
  } else if (title.toLowerCase().includes('period')) {
    actualValue = solution.orbit.orbitalPeriod;
    label = 'Orbital Period';
  }
  
  return checkNumericConstraint(actualValue, operator, value, unit, label);
};

const calculateTotalCost = (solution) => {
  if (!solution.spacecraft?.components) return 0;
  
  const componentCost = solution.spacecraft.components.reduce((sum, comp) => sum + (comp.cost || 0), 0);
  const margin = solution.spacecraft.costMargin || 25;
  return componentCost * (1 + margin / 100);
};

const calculateTotalMass = (solution) => {
  if (!solution.spacecraft?.components) return 0;
  
  const componentMass = solution.spacecraft.components.reduce((sum, comp) => sum + (comp.mass || 0), 0);
  const dryMass = solution.spacecraft.dryMass || 0;
  const margin = solution.spacecraft.dryMassMargin || 20;
  return (componentMass + dryMass) * (1 + margin / 100);
};

const calculateTotalPowerConsumed = (solution) => {
  if (!solution.spacecraft?.components) return 0;
  
  const powerConsumed = solution.spacecraft.components.reduce((sum, comp) => sum + (comp.powerConsumed || comp.activePower || 0), 0);
  const margin = solution.spacecraft.powerMargin || 30;
  return powerConsumed * (1 + margin / 100);
};

const calculateTotalPowerGenerated = (solution) => {
  if (!solution.spacecraft?.components) return 0;
  
  const powerGenerated = solution.spacecraft.components.reduce((sum, comp) => sum + (comp.powerGenerated || 0), 0);
  const margin = solution.spacecraft.powerMargin || 30;
  return powerGenerated * (1 + margin / 100);
};

const calculateNetPower = (solution) => {
  return calculateTotalPowerGenerated(solution) - calculateTotalPowerConsumed(solution);
};

// Legacy function for backward compatibility
const calculateTotalPower = (solution) => {
  return calculateTotalPowerConsumed(solution);
};

const getValidationSummary = (validationResults) => {
  const summary = {
    total: validationResults.length,
    passed: 0,
    failed: 0,
    warnings: 0,
    notApplicable: 0
  };
  
  validationResults.forEach(result => {
    switch (result.status) {
      case ValidationStatus.PASS:
        summary.passed++;
        break;
      case ValidationStatus.FAIL:
        summary.failed++;
        break;
      case ValidationStatus.WARNING:
        summary.warnings++;
        break;
      case ValidationStatus.NOT_APPLICABLE:
        summary.notApplicable++;
        break;
    }
  });
  
  return summary;
};

module.exports = {
  ValidationStatus,
  validateSolution,
  getValidationSummary,
  calculateTotalPowerConsumed,
  calculateTotalPowerGenerated,
  calculateNetPower
};