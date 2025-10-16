import { DesignSolution } from '../types/models';
import { FlightDynamicsResults } from '../../langgraph-agent/flight-dynamics';

// Constants
const EARTH_RADIUS = 6371; // km
const EARTH_MU = 398600.4418; // km³/s²
const EARTH_J2 = 1.08262668e-3;
const EARTH_ROTATION_RATE = 7.2921159e-5; // rad/s

// Ground track calculation interface
export interface GroundTrackPoint {
  latitude: number;
  longitude: number;
  time: number; // seconds from epoch
}

// Extended results for constellation analysis
export interface ConstellationResults extends FlightDynamicsResults {
  numSpacecraft: number;
  totalDataRate: number;
  constellationCoverage: number;
}

export const calculateGroundTrack = (
  altitude: number, // km
  inclination: number, // degrees
  eccentricity: number = 0,
  raan: number = 0, // Right Ascension of Ascending Node, degrees
  argumentOfPerigee: number = 0, // degrees
  trueAnomaly: number = 0, // degrees
  numPoints: number = 100,
  numOrbits: number = 1
): GroundTrackPoint[] => {
  const points: GroundTrackPoint[] = [];
  const semiMajorAxis = EARTH_RADIUS + altitude;
  const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / EARTH_MU); // seconds
  
  const incRad = inclination * Math.PI / 180;
  const raanRad = raan * Math.PI / 180;
  const argPerigeeRad = argumentOfPerigee * Math.PI / 180;
  
  for (let i = 0; i < numPoints * numOrbits; i++) {
    const meanAnomaly = (i / numPoints) * 2 * Math.PI;
    const time = (i / numPoints) * orbitalPeriod;
    
    // Simplified orbital mechanics - circular orbit approximation
    const trueAnomalyRad = meanAnomaly; // For circular orbits
    
    // Calculate position in orbital plane
    const r = semiMajorAxis; // Circular orbit
    const u = argPerigeeRad + trueAnomalyRad; // Argument of latitude
    
    // Position in orbital coordinate system
    const xOrb = r * Math.cos(u);
    const yOrb = r * Math.sin(u);
    const zOrb = 0;
    
    // Transform to Earth-centered inertial coordinates
    const cosRaan = Math.cos(raanRad);
    const sinRaan = Math.sin(raanRad);
    const cosInc = Math.cos(incRad);
    const sinInc = Math.sin(incRad);
    
    const xEci = cosRaan * xOrb - sinRaan * cosInc * yOrb;
    const yEci = sinRaan * xOrb + cosRaan * cosInc * yOrb;
    const zEci = sinInc * yOrb;
    
    // Account for Earth rotation
    const earthRotation = EARTH_ROTATION_RATE * time;
    const xEcef = Math.cos(earthRotation) * xEci + Math.sin(earthRotation) * yEci;
    const yEcef = -Math.sin(earthRotation) * xEci + Math.cos(earthRotation) * yEci;
    const zEcef = zEci;
    
    // Convert to latitude/longitude
    const latitude = Math.asin(zEcef / r) * 180 / Math.PI;
    let longitude = Math.atan2(yEcef, xEcef) * 180 / Math.PI;
    
    // Normalize longitude to [-180, 180]
    while (longitude > 180) longitude -= 360;
    while (longitude < -180) longitude += 360;
    
    points.push({ latitude, longitude, time });
  }
  
  return points;
};

export const calculateCurrentSatellitePosition = (
  altitude: number,
  inclination: number,
  eccentricity: number = 0,
  epochTime: Date = new Date()
): { latitude: number; longitude: number } => {
  const track = calculateGroundTrack(altitude, inclination, eccentricity, 0, 0, 0, 1, 1);
  return track[0] || { latitude: 0, longitude: 0 };
};

export const calculateFlightDynamics = (solution: DesignSolution): FlightDynamicsResults | null => {
  if (!solution.orbit || !solution.spacecraft?.length) return null;

  const { altitude, inclination, eccentricity } = solution.orbit;
  const numSpacecraft = solution.spacecraft.length;
  
  // Get average swath width from all payload components
  const swathWidths = solution.spacecraft.map(sc => {
    const payloadComponent = sc.components?.find(c => c.type === 'payload') as any;
    return payloadComponent?.swathWidth || 100;
  });
  const avgSwathWidth = swathWidths.reduce((sum, w) => sum + w, 0) / swathWidths.length;
  
  // Get total data rate from all communications components
  const totalDataRate = solution.spacecraft.reduce((total, sc) => {
    const commsComponent = sc.components?.find(c => c.type === 'communications') as any;
    return total + (commsComponent?.dataRate || 100);
  }, 0);

  // Calculate orbital period (same for all satellites)
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
  const synodic = 1 / (1/orbitalPeriod - 1/earthRotationPeriod);
  const groundTrackRepeatCycle = Math.abs(synodic) / (24 * 60); // days

  // Calculate constellation revisit time (improved with multiple satellites)
  // More realistic revisit calculation based on ground track separation
  const groundTrackSeparation = 360 * (orbitalPeriod / (24 * 60)) * Math.cos(inclination * Math.PI / 180);
  const swathCoverageKm = avgSwathWidth;
  const swathCoverageDegrees = swathCoverageKm / 111; // Rough conversion km to degrees
  
  // Number of orbits needed to cover the gap between ground tracks
  const orbitsForCoverage = Math.max(1, Math.ceil(groundTrackSeparation / swathCoverageDegrees));
  const singleSatRevisitTime = (orbitsForCoverage * orbitalPeriod) / 60; // hours
  
  // Improved constellation revisit calculation
  let constellationRevisitTime;
  if (numSpacecraft === 1) {
    constellationRevisitTime = singleSatRevisitTime;
  } else {
    // Calculate optimal phasing for constellation
    const phasingSeparation = 360 / numSpacecraft; // degrees between satellites
    const timeBetweenSats = (phasingSeparation / 360) * orbitalPeriod / 60; // hours
    
    // If swath can cover the gap between ground tracks, revisit improves significantly
    if (swathCoverageDegrees >= groundTrackSeparation / numSpacecraft) {
      // Optimal case: complete coverage with proper phasing
      constellationRevisitTime = Math.max(0.1, timeBetweenSats);
    } else {
      // Partial improvement based on coverage ratio
      const coverageRatio = (swathCoverageDegrees * numSpacecraft) / groundTrackSeparation;
      const improvementFactor = Math.min(numSpacecraft, 1 + (numSpacecraft - 1) * coverageRatio);
      constellationRevisitTime = Math.max(0.1, singleSatRevisitTime / improvementFactor);
    }
  }

  // Calculate max latitude coverage
  const maxLatitudeCoverage = Math.min(inclination, 180 - inclination);

  // Calculate ground station passes (total for all satellites)
  const orbitsPerDay = (24 * 60) / orbitalPeriod;
  const visibilityFactor = Math.sin(Math.abs(45) * Math.PI / 180); // Assume mid-latitude
  const singleSatPasses = Math.round(orbitsPerDay * visibilityFactor * 0.3);
  const totalGroundStationPasses = singleSatPasses * numSpacecraft;

  // Calculate data downlink opportunity (total for constellation)
  const passDuration = 2 * Math.sqrt(Math.pow(semiMajorAxis, 2) - Math.pow(EARTH_RADIUS, 2)) / orbitalVelocity / 60;
  const totalDownlinkTime = totalGroundStationPasses * passDuration;
  const dataDownlinkOpportunity = Math.min(totalDownlinkTime, 1000 / (totalDataRate / numSpacecraft));

  return {
    orbitalPeriod,
    orbitalVelocity,
    groundTrackRepeatCycle,
    revisitTime: constellationRevisitTime,
    swathCoverage: avgSwathWidth,
    maxLatitudeCoverage,
    eclipseDuration,
    sunlightDuration,
    groundStationPasses: totalGroundStationPasses,
    dataDownlinkOpportunity
  };
};

// Debug function to check calculations
export const debugFlightDynamics = (solution: DesignSolution) => {
  if (!solution.orbit) return;
  
  const { altitude, inclination } = solution.orbit;
  const numSpacecraft = solution.spacecraft.length;
  const semiMajorAxis = EARTH_RADIUS + altitude;
  const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / EARTH_MU) / 60;
  
  const swathWidths = solution.spacecraft.map(sc => {
    const payloadComponent = sc.components?.find(c => c.type === 'payload') as any;
    return payloadComponent?.swathWidth || 100;
  });
  const avgSwathWidth = swathWidths.reduce((sum, w) => sum + w, 0) / swathWidths.length;
  
  const groundTrackSeparation = 360 * (orbitalPeriod / (24 * 60)) * Math.cos(inclination * Math.PI / 180);
  const swathCoverageDegrees = avgSwathWidth / 111;
  const orbitsForCoverage = Math.max(1, Math.ceil(groundTrackSeparation / swathCoverageDegrees));
  const singleSatRevisitTime = (orbitsForCoverage * orbitalPeriod) / 60;
  
  // Improved constellation revisit calculation
  let constellationRevisitTime;
  if (numSpacecraft === 1) {
    constellationRevisitTime = singleSatRevisitTime;
  } else {
    const phasingSeparation = 360 / numSpacecraft;
    const timeBetweenSats = (phasingSeparation / 360) * orbitalPeriod / 60;
    
    if (swathCoverageDegrees >= groundTrackSeparation / numSpacecraft) {
      constellationRevisitTime = Math.max(0.1, timeBetweenSats);
    } else {
      const coverageRatio = (swathCoverageDegrees * numSpacecraft) / groundTrackSeparation;
      const improvementFactor = Math.min(numSpacecraft, 1 + (numSpacecraft - 1) * coverageRatio);
      constellationRevisitTime = Math.max(0.1, singleSatRevisitTime / improvementFactor);
    }
  }
  
  const phasingSeparation = numSpacecraft > 1 ? 360 / numSpacecraft : 0;
  const timeBetweenSats = numSpacecraft > 1 ? (phasingSeparation / 360) * orbitalPeriod / 60 : 0;
  const coverageRatio = numSpacecraft > 1 ? (swathCoverageDegrees * numSpacecraft) / groundTrackSeparation : 0;
  
  console.log('Flight Dynamics Debug:', {
    altitude,
    inclination,
    numSpacecraft,
    orbitalPeriod: orbitalPeriod.toFixed(1) + ' min',
    avgSwathWidth: avgSwathWidth.toFixed(1) + ' km',
    groundTrackSeparation: groundTrackSeparation.toFixed(1) + '°',
    swathCoverageDegrees: swathCoverageDegrees.toFixed(1) + '°',
    phasingSeparation: phasingSeparation.toFixed(1) + '°',
    timeBetweenSats: timeBetweenSats.toFixed(2) + ' hrs',
    coverageRatio: coverageRatio.toFixed(2),
    orbitsForCoverage,
    singleSatRevisitTime: singleSatRevisitTime.toFixed(1) + ' hrs',
    constellationRevisitTime: constellationRevisitTime.toFixed(1) + ' hrs'
  });
  
  return {
    singleSatRevisitTime,
    constellationRevisitTime,
    phasingSeparation: numSpacecraft > 1 ? 360 / numSpacecraft : 0,
    timeBetweenSats: numSpacecraft > 1 ? (360 / numSpacecraft / 360) * orbitalPeriod / 60 : 0,
    coverageRatio: numSpacecraft > 1 ? (swathCoverageDegrees * numSpacecraft) / groundTrackSeparation : 0
  };
};