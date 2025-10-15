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
  if (!solution.orbit) return null;

  const { altitude, inclination, eccentricity } = solution.orbit;
  
  // Get swath width from payload components
  const payloadComponent = solution.spacecraft?.[0]?.components
    ?.find(c => c.type === 'payload') as any;
  const swathWidth = payloadComponent?.swathWidth || 100;
  
  // Get data rate from communications components  
  const commsComponent = solution.spacecraft?.[0]?.components
    ?.find(c => c.type === 'communications') as any;
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
  const synodic = 1 / (1/orbitalPeriod - 1/earthRotationPeriod);
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