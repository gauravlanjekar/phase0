"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFlightDynamics = void 0;
// Constants
const EARTH_RADIUS = 6371; // km
const EARTH_MU = 398600.4418; // km³/s²
const EARTH_J2 = 1.08262668e-3;
const calculateFlightDynamics = (solution) => {
    if (!solution.orbit)
        return null;
    const { altitude, inclination, eccentricity } = solution.orbit;
    // Get swath width from payload components
    const payloadComponent = solution.spacecraft?.[0]?.components
        ?.find(c => c.type === 'payload');
    const swathWidth = payloadComponent?.swathWidth || 100;
    // Get data rate from communications components  
    const commsComponent = solution.spacecraft?.[0]?.components
        ?.find(c => c.type === 'communications');
    const dataRate = commsComponent?.dataRate || 100;
    // Calculate orbital period
    const semiMajorAxis = EARTH_RADIUS + altitude;
    const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / EARTH_MU) / 60; // minutes
    // Calculate orbital velocity
    const orbitalVelocity = Math.sqrt(EARTH_MU / semiMajorAxis);
    // Calculate eclipse duration
    const eclipseAngle = 2 * Math.asin(EARTH_RADIUS / semiMajorAxis) * 180 / Math.PI;
    const eclipseDuration = (eclipseAngle / 360) * orbitalPeriod;
    const sunlightDuration = orbitalPeriod - eclipseDuration;
    // Calculate ground track repeat cycle
    const earthRotationPeriod = 24 * 60; // minutes
    const synodic = 1 / (1 / orbitalPeriod - 1 / earthRotationPeriod);
    const groundTrackRepeatCycle = Math.abs(synodic) / (24 * 60); // days
    // Calculate revisit time
    const groundTrackSeparation = 360 * (orbitalPeriod / (24 * 60)) * Math.cos(inclination * Math.PI / 180);
    const orbitsForCoverage = Math.ceil(360 / (swathWidth / 111));
    const revisitTime = (orbitsForCoverage * orbitalPeriod) / 60; // hours
    // Calculate max latitude coverage
    const maxLatitudeCoverage = Math.min(inclination, 180 - inclination);
    // Calculate ground station passes
    const orbitsPerDay = (24 * 60) / orbitalPeriod;
    const visibilityFactor = Math.sin(Math.abs(45) * Math.PI / 180); // Assume mid-latitude
    const groundStationPasses = Math.round(orbitsPerDay * visibilityFactor * 0.3);
    // Calculate sun-synchronous inclination
    const n = Math.sqrt(EARTH_MU / Math.pow(semiMajorAxis, 3));
    const requiredPrecession = 360 / 365.25 * Math.PI / 180 / (24 * 3600);
    const cosInc = -2 * requiredPrecession / (3 * n * EARTH_J2 * Math.pow(EARTH_RADIUS / semiMajorAxis, 2));
    const sunSynchronousInclination = Math.acos(Math.max(-1, Math.min(1, cosInc))) * 180 / Math.PI;
    const isSunSynchronous = Math.abs(inclination - sunSynchronousInclination) < 1;
    // Calculate data downlink opportunity
    const passDuration = 2 * Math.sqrt(Math.pow(semiMajorAxis, 2) - Math.pow(EARTH_RADIUS, 2)) / orbitalVelocity / 60;
    const dataDownlinkOpportunity = Math.min(groundStationPasses * passDuration, 1000 / dataRate);
    return {
        orbitalPeriod,
        orbitalVelocity,
        groundTrackRepeatCycle,
        revisitTime,
        swathCoverage: swathWidth,
        maxLatitudeCoverage,
        eclipseDuration,
        sunlightDuration,
        groundStationPasses,
        dataDownlinkOpportunity
    };
};
exports.calculateFlightDynamics = calculateFlightDynamics;
//# sourceMappingURL=flightDynamics.js.map