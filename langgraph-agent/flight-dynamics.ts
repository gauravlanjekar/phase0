// Flight Dynamics Calculations for Mission Analysis

// Constants
const EARTH_RADIUS = 6371; // km
const EARTH_MU = 398600.4418; // km³/s²
const EARTH_J2 = 1.08262668e-3;
const EARTH_ROTATION_RATE = 7.2921159e-5; // rad/s

export interface OrbitParameters {
  altitude: number; // km
  inclination: number; // degrees
  eccentricity: number;
  period?: number; // minutes
}

export interface FlightDynamicsResults {
  orbitalPeriod: number; // minutes
  orbitalVelocity: number; // km/s
  groundTrackRepeatCycle: number; // days
  revisitTime: number; // hours
  swathCoverage: number; // km
  maxLatitudeCoverage: number; // degrees
  eclipseDuration: number; // minutes per orbit
  sunlightDuration: number; // minutes per orbit
  groundStationPasses: number; // per day
  dataDownlinkOpportunity: number; // minutes per day
}

export class FlightDynamicsCalculator {
  
  static calculateOrbitalPeriod(altitude: number): number {
    // T = 2π * sqrt(a³/μ) where a = R_earth + altitude
    const semiMajorAxis = EARTH_RADIUS + altitude;
    const period = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / EARTH_MU);
    return period / 60; // Convert to minutes
  }

  static calculateOrbitalVelocity(altitude: number): number {
    // v = sqrt(μ/r)
    const radius = EARTH_RADIUS + altitude;
    return Math.sqrt(EARTH_MU / radius);
  }

  static calculateGroundTrackRepeat(altitude: number, inclination: number): number {
    const period = this.calculateOrbitalPeriod(altitude);
    if (!period || period <= 0) return 0;
    
    const nodePrecession = this.calculateNodePrecession(altitude, inclination);
    
    // Simplified repeat cycle calculation
    const earthRotationPeriod = 24 * 60; // minutes
    const denominator = 1/period - 1/earthRotationPeriod;
    if (Math.abs(denominator) < 1e-10) return 0;
    
    const synodic = 1 / denominator;
    return Math.abs(synodic) / (24 * 60); // Convert to days
  }

  static calculateNodePrecession(altitude: number, inclination: number): number {
    // Nodal precession due to J2 perturbation
    const semiMajorAxis = EARTH_RADIUS + altitude;
    const n = Math.sqrt(EARTH_MU / Math.pow(semiMajorAxis, 3)); // Mean motion
    const incRad = inclination * Math.PI / 180;
    
    return -1.5 * n * EARTH_J2 * Math.pow(EARTH_RADIUS / semiMajorAxis, 2) * Math.cos(incRad);
  }

  static calculateRevisitTime(altitude: number, inclination: number, swathWidth: number): number {
    const period = this.calculateOrbitalPeriod(altitude);
    if (!period || period <= 0) return 0;
    
    const groundTrackSeparation = this.calculateGroundTrackSeparation(altitude, inclination);
    
    // Time between adjacent ground tracks
    if (!swathWidth || swathWidth <= 0) return 0;
    const orbitsForCoverage = Math.ceil(360 / (swathWidth / 111)); // Rough approximation
    return (orbitsForCoverage * period) / 60; // Convert to hours
  }

  static calculateGroundTrackSeparation(altitude: number, inclination: number): number {
    const period = this.calculateOrbitalPeriod(altitude);
    const earthRotation = 360 * (period / (24 * 60)); // degrees
    return earthRotation * Math.cos(inclination * Math.PI / 180);
  }

  static calculateEclipseDuration(altitude: number): number {
    const period = this.calculateOrbitalPeriod(altitude);
    if (!period || period <= 0) return 0;
    
    const radius = EARTH_RADIUS + altitude;
    if (radius <= EARTH_RADIUS) return 0;
    
    // Eclipse angle calculation
    const ratio = EARTH_RADIUS / radius;
    if (ratio > 1) return 0;
    
    const eclipseAngle = 2 * Math.asin(ratio) * 180 / Math.PI;
    return (eclipseAngle / 360) * period;
  }

  static calculateMaxLatitudeCoverage(inclination: number): number {
    return Math.min(inclination, 180 - inclination);
  }

  static calculateGroundStationPasses(altitude: number, stationLatitude: number, elevationMask: number = 5): number {
    const period = this.calculateOrbitalPeriod(altitude);
    if (!period || period <= 0) return 0;
    
    const orbitsPerDay = (24 * 60) / period;
    
    // Simplified calculation - assumes station visibility
    const visibilityFactor = Math.sin(Math.abs(stationLatitude) * Math.PI / 180);
    return Math.round(orbitsPerDay * visibilityFactor * 0.3); // Rough approximation
  }

  static calculateDataDownlinkTime(altitude: number, dataRate: number, dataVolume: number): number {
    const passesPerDay = this.calculateGroundStationPasses(altitude, 45); // Assume mid-latitude station
    const passDuration = this.calculatePassDuration(altitude);
    
    const totalDownlinkTime = passesPerDay * passDuration;
    const requiredTime = dataVolume / dataRate; // minutes
    
    return Math.min(totalDownlinkTime, requiredTime);
  }

  static calculatePassDuration(altitude: number, elevationMask: number = 5): number {
    // Maximum pass duration calculation
    const radius = EARTH_RADIUS + altitude;
    const elevationRad = elevationMask * Math.PI / 180;
    
    const maxElevationAngle = Math.acos(EARTH_RADIUS / radius);
    const passDuration = 2 * Math.sqrt(Math.pow(radius, 2) - Math.pow(EARTH_RADIUS, 2)) / this.calculateOrbitalVelocity(altitude);
    
    return passDuration / 60; // Convert to minutes
  }

  static calculateSunSynchronousInclination(altitude: number): number {
    // Calculate inclination for sun-synchronous orbit
    const semiMajorAxis = EARTH_RADIUS + altitude;
    const n = Math.sqrt(EARTH_MU / Math.pow(semiMajorAxis, 3));
    
    const requiredPrecession = 360 / 365.25 * Math.PI / 180 / (24 * 3600); // rad/s
    const cosInc = -2 * requiredPrecession / (3 * n * EARTH_J2 * Math.pow(EARTH_RADIUS / semiMajorAxis, 2));
    
    return Math.acos(Math.max(-1, Math.min(1, cosInc))) * 180 / Math.PI;
  }

  static performCompleteAnalysis(orbit: OrbitParameters, swathWidth: number = 100, dataRate: number = 100): FlightDynamicsResults {
    const { altitude, inclination, eccentricity } = orbit;
    
    // Validate inputs
    if (!altitude || altitude <= 0) {
      throw new Error('Invalid altitude provided');
    }
    
    const orbitalPeriod = this.calculateOrbitalPeriod(altitude);
    const orbitalVelocity = this.calculateOrbitalVelocity(altitude);
    const groundTrackRepeatCycle = this.calculateGroundTrackRepeat(altitude, inclination);
    const revisitTime = this.calculateRevisitTime(altitude, inclination, swathWidth);
    const eclipseDuration = this.calculateEclipseDuration(altitude);
    const sunlightDuration = orbitalPeriod > eclipseDuration ? orbitalPeriod - eclipseDuration : 0;
    const maxLatitudeCoverage = this.calculateMaxLatitudeCoverage(inclination);
    const groundStationPasses = this.calculateGroundStationPasses(altitude, 45);
    const dataDownlinkOpportunity = this.calculateDataDownlinkTime(altitude, dataRate, 1000);

    return {
      orbitalPeriod: orbitalPeriod || 0,
      orbitalVelocity: orbitalVelocity || 0,
      groundTrackRepeatCycle: groundTrackRepeatCycle || 0,
      revisitTime: revisitTime || 0,
      swathCoverage: swathWidth || 0,
      maxLatitudeCoverage: maxLatitudeCoverage || 0,
      eclipseDuration: eclipseDuration || 0,
      sunlightDuration: sunlightDuration || 0,
      groundStationPasses: groundStationPasses || 0,
      dataDownlinkOpportunity: dataDownlinkOpportunity || 0
    };
  }
}