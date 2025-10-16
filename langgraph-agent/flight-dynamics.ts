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

export interface GroundStationAnalysis {
  stationName?: string;
  latitude: number;
  passesPerDay: number;
  passDuration: number; // minutes
  totalContactTime: number; // minutes per day
  maxElevation: number; // degrees
  dataDownlinkCapacity: number; // MB per day
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
  groundStationAnalysis?: GroundStationAnalysis[];
}

export interface ConstellationResults {
  constellationRevisitTime: number; // hours
  globalCoverageTime: number; // hours
  averageGroundStationPasses: number; // per day per spacecraft
  totalDataDownlinkCapacity: number; // Mbps
  constellationCoverage: number; // percentage
  redundancyFactor: number; // coverage overlap
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

  static analyzeGroundStation(altitude: number, inclination: number, stationLat: number, stationName?: string, dataRate: number = 100): GroundStationAnalysis {
    const passesPerDay = this.calculateGroundStationPasses(altitude, stationLat);
    const passDuration = this.calculatePassDuration(altitude);
    const totalContactTime = passesPerDay * passDuration;
    const maxElevation = this.calculateMaxElevation(altitude, stationLat, inclination);
    const dataDownlinkCapacity = (totalContactTime * dataRate * 60) / 8 / 1024; // MB per day
    
    return {
      stationName,
      latitude: stationLat,
      passesPerDay,
      passDuration,
      totalContactTime,
      maxElevation,
      dataDownlinkCapacity
    };
  }

  static calculateMaxElevation(altitude: number, stationLat: number, inclination: number): number {
    const radius = EARTH_RADIUS + altitude;
    const stationLatRad = Math.abs(stationLat) * Math.PI / 180;
    const incRad = inclination * Math.PI / 180;
    
    // Simplified max elevation calculation
    const maxElevRad = Math.asin(EARTH_RADIUS / radius);
    return Math.min(90, maxElevRad * 180 / Math.PI + 30); // Rough approximation
  }

  static performCompleteAnalysis(
    orbit: OrbitParameters, 
    swathWidth: number = 100, 
    dataRate: number = 100,
    groundStations?: Array<{latitude: number, name?: string, maxDataRate?: number}>
  ): FlightDynamicsResults {
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

    // Detailed ground station analysis if provided
    let groundStationAnalysis: GroundStationAnalysis[] | undefined;
    if (groundStations && groundStations.length > 0) {
      groundStationAnalysis = groundStations.map(gs => 
        this.analyzeGroundStation(
          altitude, 
          inclination, 
          gs.latitude, 
          gs.name, 
          gs.maxDataRate || dataRate
        )
      );
    }

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
      dataDownlinkOpportunity: dataDownlinkOpportunity || 0,
      groundStationAnalysis
    };
  }

  static analyzeConstellation(
    numSpacecraft: number, 
    orbit: OrbitParameters, 
    swathWidth: number = 100,
    groundStations: Array<{latitude: number, maxDataRate: number}> = [{latitude: 45, maxDataRate: 100}]
  ): ConstellationResults {
    const singleSatRevisit = this.calculateRevisitTime(orbit.altitude, orbit.inclination, swathWidth);
    
    // More realistic constellation revisit calculation
    const orbitalPeriod = this.calculateOrbitalPeriod(orbit.altitude);
    const groundTrackSeparation = this.calculateGroundTrackSeparation(orbit.altitude, orbit.inclination);
    const swathCoverageDegrees = swathWidth / 111; // km to degrees conversion
    
    // Calculate optimal phasing for constellation
    let constellationRevisitTime;
    if (numSpacecraft === 1) {
      constellationRevisitTime = singleSatRevisit;
    } else {
      // For multiple satellites, consider orbital phasing and ground track distribution
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
        constellationRevisitTime = Math.max(0.1, singleSatRevisit / improvementFactor);
      }
    }
    
    const globalCoverageTime = Math.max(1, 24 / numSpacecraft);
    
    const avgPasses = groundStations.reduce((sum, gs) => 
      sum + this.calculateGroundStationPasses(orbit.altitude, gs.latitude), 0
    ) / groundStations.length;
    
    const totalDataRate = groundStations.reduce((sum, gs) => sum + gs.maxDataRate, 0) * numSpacecraft;
    
    const maxCoverage = this.calculateMaxLatitudeCoverage(orbit.inclination);
    const constellationCoverage = Math.min(100, maxCoverage * (1 + (numSpacecraft - 1) * 0.1));
    
    const redundancyFactor = Math.min(3, numSpacecraft / 3);
    
    return {
      constellationRevisitTime,
      globalCoverageTime,
      averageGroundStationPasses: avgPasses,
      totalDataDownlinkCapacity: totalDataRate,
      constellationCoverage,
      redundancyFactor
    };
  }
}