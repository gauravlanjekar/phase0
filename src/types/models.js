"use strict";
// Unified TypeScript Models for Mission Admin App
// Shared across UI, API, and Agent
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPowerComponent = exports.createPayloadComponent = exports.createConstraint = exports.createRequirement = exports.createObjective = exports.createMission = void 0;
// Factory Functions
const createMission = (id, brief) => ({
    id,
    brief,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
});
exports.createMission = createMission;
const createObjective = (id, title, description, priority = 'medium') => ({
    id,
    title,
    description,
    priority,
    category: 'earth_observation',
    stakeholders: []
});
exports.createObjective = createObjective;
const createRequirement = (id, title, type, description, priority = 'medium') => ({
    id,
    title,
    type,
    description,
    priority
});
exports.createRequirement = createRequirement;
const createConstraint = (id, title, constraintType, constraint, priority = 'medium') => ({
    id,
    title,
    constraint_type: constraintType,
    constraint,
    priority,
    rationale: ''
});
exports.createConstraint = createConstraint;
// Component factory functions
const createPayloadComponent = (id, name, mass, powerConsumed, cost) => ({
    id,
    name,
    type: 'payload',
    mass,
    powerGenerated: 0,
    powerConsumed,
    cost,
    trl: 6,
    reliability: 0.9
});
exports.createPayloadComponent = createPayloadComponent;
const createPowerComponent = (id, name, mass, powerGenerated, cost) => ({
    id,
    name,
    type: 'power',
    mass,
    powerGenerated,
    powerConsumed: 0,
    cost,
    trl: 7,
    reliability: 0.9
});
exports.createPowerComponent = createPowerComponent;
//# sourceMappingURL=models.js.map