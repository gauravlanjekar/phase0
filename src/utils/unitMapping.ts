// Unit mapping for component properties
// Maps component property names to their implicit units based on the model definitions

// Flight dynamics units
export const FLIGHT_DYNAMICS_UNITS: Record<string, string> = {
  orbitalPeriod: 'min',
  orbitalVelocity: 'km/s',
  revisitTime: 'hours',
  eclipseDuration: 'min',
  sunlightDuration: 'min',
  groundStationPasses: 'passes/day',
  dataDownlinkOpportunity: 'min/day',
  maxLatitudeCoverage: 'deg',
  orbitsPerDay: 'orbits/day',
  groundTrackSeparation: 'km',
  sunSynchronousInclination: 'deg'
};

export const COMPONENT_UNITS: Record<string, string> = {
  // Basic properties
  mass: 'kg',
  powerGenerated: 'W',
  powerConsumed: 'W',
  cost: 'USD',
  volume: 'L',
  
  // Temperature
  operatingTemperatureMin: '°C',
  operatingTemperatureMax: '°C',
  
  // Payload properties
  focalLength: 'm',
  apertureDiameter: 'm',
  groundSampleDistance: 'm',
  swathWidth: 'km',
  radiometricResolution: 'bits',
  dataRate: 'Mbps',
  
  // Power system properties
  batteryCapacity: 'Wh',
  solarArrayArea: 'm²',
  solarArrayEfficiency: '%',
  
  // Avionics properties
  processingPower: 'MIPS',
  memoryCapacity: 'GB',
  storageCapacity: 'GB'
};

export const ORBIT_UNITS: Record<string, string> = {
  altitude: 'km',
  inclination: 'deg',
  eccentricity: '',
  period: 'min'
};

export const GROUND_STATION_UNITS: Record<string, string> = {
  latitude: 'deg',
  longitude: 'deg',
  monthlyFee: 'USD',
  maxDataRate: 'Mbps',
  elevationMask: 'deg'
};

export const SPACECRAFT_UNITS: Record<string, string> = {
  dryMass: 'kg',
  totalPowerGenerated: 'W',
  totalPowerConsumed: 'W',
  totalCost: 'USD'
};

/**
 * Get the unit for a given property path
 */
export function getUnitForPath(path: string): string {
  // Extract the property name from the path
  const propertyMatch = path.match(/\.(\w+)$/);
  if (!propertyMatch) return '';
  
  const property = propertyMatch[1];
  
  // Check different unit mappings based on context
  if (path.startsWith('flightDynamics.')) {
    return FLIGHT_DYNAMICS_UNITS[property] || '';
  }
  if (path.includes('components')) {
    return COMPONENT_UNITS[property] || '';
  }
  if (path.includes('orbit')) {
    return ORBIT_UNITS[property] || '';
  }
  if (path.includes('groundStations')) {
    return GROUND_STATION_UNITS[property] || '';
  }
  if (path.includes('spacecraft')) {
    return SPACECRAFT_UNITS[property] || '';
  }
  
  return '';
}