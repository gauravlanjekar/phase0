// Ground track calculation for agent tools
// Constants
const EARTH_RADIUS = 6371; // km
const EARTH_MU = 398600.4418; // km³/s²
const EARTH_ROTATION_RATE = 7.2921159e-5; // rad/s

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