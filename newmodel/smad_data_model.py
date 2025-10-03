"""
SMAD Mission Data Model - Complete Version with Design Iteration Tracking
===========================================================================
Space Mission Analysis and Design methodology for Earth Observation missions.
Includes iterative design solution tracking and evaluation.
"""

from enum import Enum
from typing import Optional, Union, List, Tuple, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import math


# ============================================================================
# ENUMERATIONS
# ============================================================================

class ComparisonOperator(Enum):
    """Logical comparison operators for numeric constraints."""
    LESS_THAN = "<"
    LESS_THAN_OR_EQUAL = "<="
    EQUAL = "=="
    GREATER_THAN_OR_EQUAL = ">="
    GREATER_THAN = ">"
    BETWEEN = "between"
    NOT_EQUAL = "!="


class RequirementType(Enum):
    """Types of mission requirements."""
    SPATIAL_RESOLUTION = "spatial_resolution"
    TEMPORAL_RESOLUTION = "temporal_resolution"
    SPECTRAL_RESOLUTION = "spectral_resolution"
    RADIOMETRIC_RESOLUTION = "radiometric_resolution"
    SWATH_WIDTH = "swath_width"
    COVERAGE_AREA = "coverage_area"
    DATA_LATENCY = "data_latency"
    GEOLOCATION_ACCURACY = "geolocation_accuracy"
    SIGNAL_TO_NOISE_RATIO = "signal_to_noise_ratio"
    MISSION_LIFETIME = "mission_lifetime"
    OTHER = "other"


class ConstraintType(Enum):
    """Types of mission constraints."""
    BUDGET = "budget"
    ORBITAL = "orbital"
    TECHNOLOGY = "technology"
    REGULATORY = "regulatory"
    PHYSICAL = "physical"
    SCHEDULE = "schedule"
    MASS = "mass"
    POWER = "power"
    DATA_VOLUME = "data_volume"
    OTHER = "other"


class ComponentType(Enum):
    """Types of spacecraft components."""
    ELECTRIC_POWER_SYSTEM = "eps"
    ADCS = "adcs"
    PAYLOAD_INSTRUMENT = "payload_instrument"
    COMMUNICATIONS = "communications"
    PLATFORM_AVIONICS = "platform_avionics"
    PAYLOAD_AVIONICS = "payload_avionics"
    PROPULSION = "propulsion"
    THERMAL = "thermal"
    STRUCTURE = "structure"
    OTHER = "other"


class Unit(Enum):
    """Standard units for measurements."""
    # Distance
    METERS = "m"
    KILOMETERS = "km"
    CENTIMETERS = "cm"
    MILLIMETERS = "mm"
    MICROMETERS = "μm"
    # Time
    SECONDS = "s"
    MINUTES = "min"
    HOURS = "hr"
    DAYS = "days"
    YEARS = "years"
    # Data
    BITS = "bits"
    BYTES = "bytes"
    MEGABYTES = "MB"
    GIGABYTES = "GB"
    TERABYTES = "TB"
    MEGABITS_PER_SECOND = "Mbps"
    GIGABITS_PER_SECOND = "Gbps"
    # Mass/Power/Currency
    KILOGRAMS = "kg"
    GRAMS = "g"
    TONNES = "tonnes"
    WATTS = "W"
    KILOWATTS = "kW"
    USD = "USD"
    EUR = "EUR"
    # Angles/Spectral/Dimensionless
    DEGREES = "deg"
    RADIANS = "rad"
    NANOMETERS = "nm"
    DECIBELS = "dB"
    PERCENT = "%"
    COUNT = "count"
    UNITLESS = ""


class Priority(Enum):
    """Priority levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ObjectiveStatus(Enum):
    """Status of objective achievement (SMAD Step 2)."""
    NOT_EVALUATED = "not_evaluated"
    BELOW_THRESHOLD = "below_threshold"
    THRESHOLD_MET = "threshold_met"
    BASELINE_MET = "baseline_met"
    TARGET_MET = "target_met"
    EXCEEDED = "exceeded"


class AggregationMethod(Enum):
    """Methods for aggregating KPI values."""
    MINIMUM = "minimum"
    MAXIMUM = "maximum"
    AVERAGE = "average"
    WEIGHTED_AVERAGE = "weighted_average"
    MEDIAN = "median"
    SUM = "sum"
    PRODUCT = "product"
    CUSTOM = "custom"


class SolutionStatus(Enum):
    """Status of a design solution."""
    PROPOSED = "proposed"
    UNDER_EVALUATION = "under_evaluation"
    REQUIREMENTS_MET = "requirements_met"
    REQUIREMENTS_NOT_MET = "requirements_not_met"
    SELECTED = "selected"
    REJECTED = "rejected"


# ============================================================================
# GEOGRAPHIC MODELS
# ============================================================================

@dataclass
class GeoPoint:
    """Geographic point with lat/lon/altitude."""
    latitude: float  # -90 to +90
    longitude: float  # -180 to +180
    altitude: Optional[float] = None
    name: str = ""
    
    def __post_init__(self):
        if not -90 <= self.latitude <= 90:
            raise ValueError(f"Latitude must be [-90, 90], got {self.latitude}")
        if not -180 <= self.longitude <= 180:
            raise ValueError(f"Longitude must be [-180, 180], got {self.longitude}")
    
    def to_tuple(self) -> Tuple[float, float]:
        return (self.latitude, self.longitude)
    
    def __str__(self) -> str:
        coord = f"({self.latitude:.4f}°, {self.longitude:.4f}°)"
        return f"{self.name}: {coord}" if self.name else coord


@dataclass
class GeoPolygon:
    """Closed polygon with up to 20 points."""
    points: List[GeoPoint] = field(default_factory=list)
    name: str = ""
    description: str = ""
    
    def __post_init__(self):
        if len(self.points) > 20:
            raise ValueError(f"Max 20 points, got {len(self.points)}")
        if 0 < len(self.points) < 3:
            raise ValueError(f"Need 3+ points for polygon, got {len(self.points)}")
    
    def add_point(self, point: GeoPoint):
        if len(self.points) >= 20:
            raise ValueError("Already at max 20 points")
        self.points.append(point)
    
    def get_bounding_box(self) -> Tuple[float, float, float, float]:
        """Returns (min_lat, max_lat, min_lon, max_lon)."""
        if not self.points:
            return (0.0, 0.0, 0.0, 0.0)
        lats = [p.latitude for p in self.points]
        lons = [p.longitude for p in self.points]
        return (min(lats), max(lats), min(lons), max(lons))
    
    def get_center(self) -> GeoPoint:
        """Calculate centroid of bounding box."""
        if not self.points:
            return GeoPoint(0.0, 0.0)
        min_lat, max_lat, min_lon, max_lon = self.get_bounding_box()
        return GeoPoint((min_lat + max_lat) / 2, (min_lon + max_lon) / 2)
    
    @staticmethod
    def from_bounding_box(min_lat: float, max_lat: float, min_lon: float, max_lon: float, name: str = "") -> 'GeoPolygon':
        """Create rectangular polygon from bounds."""
        return GeoPolygon(points=[
            GeoPoint(min_lat, min_lon), GeoPoint(min_lat, max_lon),
            GeoPoint(max_lat, max_lon), GeoPoint(max_lat, min_lon),
            GeoPoint(min_lat, min_lon)
        ], name=name)
    
    @staticmethod
    def global_coverage() -> 'GeoPolygon':
        return GeoPolygon.from_bounding_box(-90, 90, -180, 180, "Global Coverage")


@dataclass
class GeographicRegion:
    """Named region with one or more polygons."""
    name: str
    polygons: List[GeoPolygon] = field(default_factory=list)
    region_type: str = "custom"
    description: str = ""
    
    def add_polygon(self, polygon: GeoPolygon):
        self.polygons.append(polygon)
    
    @staticmethod
    def create_global() -> 'GeographicRegion':
        region = GeographicRegion(name="Global", region_type="global")
        region.add_polygon(GeoPolygon.global_coverage())
        return region
    
    @staticmethod
    def create_point_of_interest(lat: float, lon: float, name: str = "POI") -> 'GeographicRegion':
        """Create small region around point (±0.1°)."""
        polygon = GeoPolygon(points=[
            GeoPoint(lat - 0.1, lon - 0.1), GeoPoint(lat - 0.1, lon + 0.1),
            GeoPoint(lat + 0.1, lon + 0.1), GeoPoint(lat + 0.1, lon - 0.1),
            GeoPoint(lat - 0.1, lon - 0.1)
        ], name=name)
        region = GeographicRegion(name=name, region_type="point_of_interest")
        region.add_polygon(polygon)
        return region


# ============================================================================
# ORBITAL MODELS
# ============================================================================

@dataclass
class Orbit:
    """Orbital definition with Keplerian elements and derived parameters."""
    id: str
    name: str
    label: str  # e.g., "705km SSO", "Baseline Orbit", "Trade Option A"
    
    # Classical Orbital Elements
    semi_major_axis: float  # km
    eccentricity: float = 0.0  # unitless (0 = circular)
    inclination: float = 0.0  # degrees
    raan: float = 0.0  # Right Ascension of Ascending Node, degrees
    argument_of_perigee: float = 0.0  # degrees
    true_anomaly: float = 0.0  # degrees at epoch
    
    # Epoch
    epoch: datetime = field(default_factory=datetime.now)
    
    # Derived/Convenience Parameters
    altitude: Optional[float] = None  # km (for circular orbits, altitude above surface)
    perigee_altitude: Optional[float] = None  # km
    apogee_altitude: Optional[float] = None  # km
    
    # Orbital Characteristics
    orbital_period: Optional[float] = None  # minutes
    mean_motion: Optional[float] = None  # revolutions per day
    local_time_ascending_node: Optional[str] = None  # e.g., "10:30" for SSO
    
    # Sun-Synchronous Orbit Parameters
    is_sun_synchronous: bool = False
    
    # Mission-Specific Parameters
    revisit_time_global: Optional[float] = None  # days
    coverage_per_day: Optional[float] = None  # percent of Earth
    ground_track_repeat_cycle: Optional[int] = None  # days
    
    # Lifetime and Perturbations
    orbital_lifetime: Optional[float] = None  # years
    delta_v_deorbit: Optional[float] = None  # m/s
    
    # Additional properties
    properties: Dict[str, Any] = field(default_factory=dict)
    notes: str = ""
    
    # Earth parameters for calculations
    EARTH_RADIUS: float = field(default=6378.137, init=False)  # km
    EARTH_MU: float = field(default=398600.4418, init=False)  # km³/s²
    
    def __post_init__(self):
        """Calculate derived orbital parameters."""
        # Calculate altitude for circular orbit
        if self.eccentricity < 0.001 and self.altitude is None:
            self.altitude = self.semi_major_axis - self.EARTH_RADIUS
        
        # Calculate perigee and apogee
        if self.eccentricity > 0:
            self.perigee_altitude = self.semi_major_axis * (1 - self.eccentricity) - self.EARTH_RADIUS
            self.apogee_altitude = self.semi_major_axis * (1 + self.eccentricity) - self.EARTH_RADIUS
        
        # Calculate orbital period (minutes)
        self.orbital_period = 2 * math.pi * math.sqrt(self.semi_major_axis**3 / self.EARTH_MU) / 60
        
        # Calculate mean motion (rev/day)
        self.mean_motion = 1440 / self.orbital_period  # 1440 min/day
    
    def calculate_ground_track_velocity(self) -> float:
        """Calculate ground track velocity in km/s."""
        if self.altitude:
            orbital_velocity = math.sqrt(self.EARTH_MU / (self.EARTH_RADIUS + self.altitude))
            earth_rotation_velocity = (2 * math.pi * self.EARTH_RADIUS * math.cos(math.radians(self.inclination))) / 86400
            return orbital_velocity - earth_rotation_velocity
        return 0.0
    
    def add_property(self, key: str, value: Any):
        """Add custom property."""
        self.properties[key] = value
    
    def __str__(self) -> str:
        if self.altitude:
            return (f"{self.label}: {self.altitude:.1f}km, "
                   f"i={self.inclination:.2f}°, e={self.eccentricity:.4f}")
        return (f"{self.label}: a={self.semi_major_axis:.1f}km, "
               f"i={self.inclination:.2f}°, e={self.eccentricity:.4f}")
    
    def summary(self) -> str:
        """Detailed orbit summary."""
        s = f"\nOrbit: {self.name} ({self.label})\n"
        s += "=" * 60 + "\n"
        s += "Keplerian Elements:\n"
        s += f"  Semi-major Axis: {self.semi_major_axis:.3f} km\n"
        s += f"  Eccentricity: {self.eccentricity:.6f}\n"
        s += f"  Inclination: {self.inclination:.4f}°\n"
        s += f"  RAAN: {self.raan:.4f}°\n"
        s += f"  Argument of Perigee: {self.argument_of_perigee:.4f}°\n"
        s += f"  True Anomaly: {self.true_anomaly:.4f}°\n"
        
        s += "\nDerived Parameters:\n"
        if self.altitude:
            s += f"  Altitude (circular): {self.altitude:.2f} km\n"
        if self.perigee_altitude and self.apogee_altitude:
            s += f"  Perigee Altitude: {self.perigee_altitude:.2f} km\n"
            s += f"  Apogee Altitude: {self.apogee_altitude:.2f} km\n"
        s += f"  Orbital Period: {self.orbital_period:.2f} minutes\n"
        s += f"  Mean Motion: {self.mean_motion:.4f} rev/day\n"
        
        if self.is_sun_synchronous:
            s += f"  Sun-Synchronous: Yes\n"
            if self.local_time_ascending_node:
                s += f"  LTAN: {self.local_time_ascending_node}\n"
        
        s += "\nMission Performance:\n"
        if self.revisit_time_global:
            s += f"  Global Revisit Time: {self.revisit_time_global:.2f} days\n"
        if self.coverage_per_day:
            s += f"  Daily Coverage: {self.coverage_per_day:.1f}%\n"
        if self.ground_track_repeat_cycle:
            s += f"  Ground Track Repeat: {self.ground_track_repeat_cycle} days\n"
        if self.orbital_lifetime:
            s += f"  Orbital Lifetime: {self.orbital_lifetime:.1f} years\n"
        
        return s


# ============================================================================
# BASE CLASSES
# ============================================================================

@dataclass
class NumericConstraintValue:
    """Numeric value with comparison logic."""
    operator: ComparisonOperator
    value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    unit: Unit = Unit.UNITLESS
    
    def __post_init__(self):
        if self.operator == ComparisonOperator.BETWEEN:
            if self.min_value is None or self.max_value is None:
                raise ValueError("BETWEEN requires min_value and max_value")
            if self.min_value >= self.max_value:
                raise ValueError("min_value must be < max_value")
        else:
            if self.value is None:
                raise ValueError(f"{self.operator.value} requires a value")
    
    def evaluate(self, test_value: float) -> bool:
        """Check if test_value satisfies constraint."""
        if self.operator == ComparisonOperator.LESS_THAN:
            return test_value < self.value
        elif self.operator == ComparisonOperator.LESS_THAN_OR_EQUAL:
            return test_value <= self.value
        elif self.operator == ComparisonOperator.EQUAL:
            return test_value == self.value
        elif self.operator == ComparisonOperator.GREATER_THAN_OR_EQUAL:
            return test_value >= self.value
        elif self.operator == ComparisonOperator.GREATER_THAN:
            return test_value > self.value
        elif self.operator == ComparisonOperator.BETWEEN:
            return self.min_value <= test_value <= self.max_value
        elif self.operator == ComparisonOperator.NOT_EQUAL:
            return test_value != self.value
        return False
    
    def __str__(self) -> str:
        if self.operator == ComparisonOperator.BETWEEN:
            return f"between {self.min_value} and {self.max_value} {self.unit.value}"
        return f"{self.operator.value} {self.value} {self.unit.value}"


# ============================================================================
# SPACECRAFT COMPONENT MODELS
# ============================================================================

@dataclass
class Component:
    """Base spacecraft component with mandatory properties."""
    id: str
    name: str
    component_type: ComponentType
    active_power: float  # Watts
    passive_power: float  # Watts (standby/survival mode)
    mass: float  # kilograms
    cost: float  # USD
    manufacturer: str = ""
    technology_readiness_level: int = 9  # TRL 1-9
    heritage: str = ""
    properties: Dict[str, Any] = field(default_factory=dict)
    notes: str = ""
    
    def add_property(self, key: str, value: Any):
        """Add custom property to component."""
        self.properties[key] = value
    
    def get_property(self, key: str) -> Optional[Any]:
        """Retrieve custom property."""
        return self.properties.get(key)
    
    def __str__(self) -> str:
        return (f"{self.name} ({self.component_type.value}): "
                f"{self.mass:.1f}kg, {self.active_power:.1f}W, ${self.cost:,.0f}")


@dataclass
class EPSComponent(Component):
    """Electric Power System component."""
    def __init__(self, id: str, name: str, active_power: float, passive_power: float,
                 mass: float, cost: float, **kwargs):
        super().__init__(id=id, name=name, component_type=ComponentType.ELECTRIC_POWER_SYSTEM,
                        active_power=active_power, passive_power=passive_power,
                        mass=mass, cost=cost, **kwargs)
        self.properties.setdefault('solar_array_area', 0.0)  # m²
        self.properties.setdefault('solar_cell_efficiency', 0.0)  # %
        self.properties.setdefault('battery_capacity', 0.0)  # Wh
        self.properties.setdefault('battery_dod', 0.0)  # Depth of discharge %
        self.properties.setdefault('power_generation_bol', 0.0)  # W at beginning of life
        self.properties.setdefault('power_generation_eol', 0.0)  # W at end of life


@dataclass
class ADCSComponent(Component):
    """Attitude Determination and Control System component."""
    def __init__(self, id: str, name: str, active_power: float, passive_power: float,
                 mass: float, cost: float, **kwargs):
        super().__init__(id=id, name=name, component_type=ComponentType.ADCS,
                        active_power=active_power, passive_power=passive_power,
                        mass=mass, cost=cost, **kwargs)
        self.properties.setdefault('pointing_accuracy', 0.0)  # arcseconds
        self.properties.setdefault('pointing_stability', 0.0)  # arcseconds/sec
        self.properties.setdefault('slew_rate', 0.0)  # deg/sec
        self.properties.setdefault('momentum_storage', 0.0)  # Nms
        self.properties.setdefault('reaction_wheel_count', 4)
        self.properties.setdefault('star_tracker_accuracy', 0.0)  # arcseconds


@dataclass
class CommunicationsComponent(Component):
    """Communications subsystem component."""
    def __init__(self, id: str, name: str, active_power: float, passive_power: float,
                 mass: float, cost: float, **kwargs):
        super().__init__(id=id, name=name, component_type=ComponentType.COMMUNICATIONS,
                        active_power=active_power, passive_power=passive_power,
                        mass=mass, cost=cost, **kwargs)
        self.properties.setdefault('downlink_data_rate', 0.0)  # Mbps
        self.properties.setdefault('uplink_data_rate', 0.0)  # Mbps
        self.properties.setdefault('frequency_band', '')  # X-band, Ka-band, etc.
        self.properties.setdefault('antenna_gain', 0.0)  # dBi
        self.properties.setdefault('transmitter_power', 0.0)  # W
        self.properties.setdefault('onboard_storage', 0.0)  # GB


@dataclass
class AvionicsComponent(Component):
    """Avionics component (platform or payload)."""
    def __init__(self, id: str, name: str, active_power: float, passive_power: float,
                 mass: float, cost: float, component_type: ComponentType, **kwargs):
        if component_type not in [ComponentType.PLATFORM_AVIONICS, ComponentType.PAYLOAD_AVIONICS]:
            component_type = ComponentType.PLATFORM_AVIONICS
        super().__init__(id=id, name=name, component_type=component_type,
                        active_power=active_power, passive_power=passive_power,
                        mass=mass, cost=cost, **kwargs)
        self.properties.setdefault('processor_speed', 0.0)  # MHz
        self.properties.setdefault('memory_capacity', 0.0)  # GB
        self.properties.setdefault('storage_capacity', 0.0)  # GB
        self.properties.setdefault('radiation_tolerance', '')  # rad dose


@dataclass
class SpectralBand:
    """Definition of a spectral band for multispectral/hyperspectral instruments."""
    name: str
    center_wavelength: float  # nanometers
    bandwidth: float  # nanometers
    purpose: str = ""  # e.g., "vegetation", "water", "thermal"
    
    def __str__(self) -> str:
        return f"{self.name}: {self.center_wavelength}nm ±{self.bandwidth/2}nm"


@dataclass
class PayloadInstrument(Component):
    """Earth observation optical payload instrument with detailed parameters."""
    def __init__(self, id: str, name: str, active_power: float, passive_power: float,
                 mass: float, cost: float, **kwargs):
        super().__init__(id=id, name=name, component_type=ComponentType.PAYLOAD_INSTRUMENT,
                        active_power=active_power, passive_power=passive_power,
                        mass=mass, cost=cost)
        
        # Optical System Parameters
        self.focal_length: float = kwargs.get('focal_length', 0.0)  # meters
        self.aperture_diameter: float = kwargs.get('aperture_diameter', 0.0)  # meters
        self.f_number: float = kwargs.get('f_number', 0.0)  # unitless
        
        # Detector Parameters
        self.detector_type: str = kwargs.get('detector_type', 'CCD')  # CCD, CMOS, etc.
        self.detector_array_size_along_track: int = kwargs.get('detector_array_size_along_track', 0)  # pixels
        self.detector_array_size_across_track: int = kwargs.get('detector_array_size_across_track', 0)  # pixels
        self.pixel_pitch: float = kwargs.get('pixel_pitch', 0.0)  # micrometers
        
        # Spectral Parameters
        self.spectral_bands: List[SpectralBand] = kwargs.get('spectral_bands', [])
        self.num_bands: int = len(self.spectral_bands)
        
        # Performance Parameters
        self.ground_sample_distance: float = kwargs.get('ground_sample_distance', 0.0)  # meters at nadir
        self.swath_width: float = kwargs.get('swath_width', 0.0)  # kilometers
        self.signal_to_noise_ratio: float = kwargs.get('signal_to_noise_ratio', 0.0)  # unitless or dB
        self.radiometric_resolution: int = kwargs.get('radiometric_resolution', 12)  # bits
        self.mtf_nyquist: float = kwargs.get('mtf_nyquist', 0.0)  # Modulation Transfer Function at Nyquist
        
        # Operational Parameters
        self.integration_time: float = kwargs.get('integration_time', 0.0)  # milliseconds
        self.duty_cycle: float = kwargs.get('duty_cycle', 0.0)  # percent
        self.data_rate: float = kwargs.get('data_rate', 0.0)  # Mbps
        self.quantization: int = kwargs.get('quantization', 12)  # bits per pixel
        
        # Optical Quality
        self.optical_transmission: float = kwargs.get('optical_transmission', 0.0)  # percent
        self.quantum_efficiency: float = kwargs.get('quantum_efficiency', 0.0)  # percent
        
        # Physical constraints
        self.field_of_view: float = kwargs.get('field_of_view', 0.0)  # degrees
        self.instrument_temperature: float = kwargs.get('instrument_temperature', 293.0)  # Kelvin
        self.temperature_stability: float = kwargs.get('temperature_stability', 0.0)  # Kelvin
        
    def add_spectral_band(self, band: SpectralBand):
        """Add a spectral band to the instrument."""
        self.spectral_bands.append(band)
        self.num_bands = len(self.spectral_bands)
    
    def calculate_f_number(self) -> float:
        """Calculate f-number from focal length and aperture."""
        if self.aperture_diameter > 0:
            self.f_number = self.focal_length / self.aperture_diameter
        return self.f_number
    
    def calculate_gsd_from_orbit(self, altitude_km: float) -> float:
        """Calculate GSD from orbital altitude (simplified)."""
        if self.focal_length > 0 and self.pixel_pitch > 0:
            altitude_m = altitude_km * 1000
            self.ground_sample_distance = (altitude_m * self.pixel_pitch * 1e-6) / self.focal_length
        return self.ground_sample_distance
    
    def calculate_swath_from_array(self, altitude_km: float) -> float:
        """Calculate swath width from detector array and altitude."""
        if self.focal_length > 0 and self.detector_array_size_across_track > 0 and self.pixel_pitch > 0:
            altitude_m = altitude_km * 1000
            array_width_m = self.detector_array_size_across_track * self.pixel_pitch * 1e-6
            self.swath_width = (altitude_m * array_width_m) / self.focal_length / 1000  # km
        return self.swath_width
    
    def calculate_data_rate(self) -> float:
        """Calculate data rate from imaging parameters."""
        if self.detector_array_size_across_track > 0 and self.integration_time > 0:
            pixels_per_second = (self.detector_array_size_across_track * 
                                self.num_bands) / (self.integration_time / 1000)
            self.data_rate = (pixels_per_second * self.quantization) / 1e6  # Mbps
        return self.data_rate


@dataclass
class Spacecraft:
    """Complete spacecraft with all subsystems."""
    id: str
    name: str
    components: List[Component] = field(default_factory=list)
    dry_mass_margin: float = 20.0  # percent
    power_margin: float = 30.0  # percent
    cost_margin: float = 25.0  # percent
    design_life: float = 5.0  # years
    
    def add_component(self, component: Component):
        """Add a component to the spacecraft."""
        self.components.append(component)
    
    def get_component_by_id(self, component_id: str) -> Optional[Component]:
        """Retrieve component by ID."""
        for comp in self.components:
            if comp.id == component_id:
                return comp
        return None
    
    def get_components_by_type(self, component_type: ComponentType) -> List[Component]:
        """Get all components of a specific type."""
        return [c for c in self.components if c.component_type == component_type]
    
    def get_payload_instruments(self) -> List[PayloadInstrument]:
        """Get all payload instruments."""
        return [c for c in self.components 
                if isinstance(c, PayloadInstrument)]
    
    def calculate_total_mass(self, include_margin: bool = True) -> float:
        """Calculate total spacecraft mass."""
        total = sum(c.mass for c in self.components)
        if include_margin:
            total *= (1 + self.dry_mass_margin / 100)
        return total
    
    def calculate_total_power(self, mode: str = 'active', include_margin: bool = True) -> float:
        """Calculate total power consumption."""
        if mode == 'active':
            total = sum(c.active_power for c in self.components)
        else:
            total = sum(c.passive_power for c in self.components)
        if include_margin:
            total *= (1 + self.power_margin / 100)
        return total
    
    def calculate_total_cost(self, include_margin: bool = True) -> float:
        """Calculate total component cost."""
        total = sum(c.cost for c in self.components)
        if include_margin:
            total *= (1 + self.cost_margin / 100)
        return total
    
    def calculate_mass_by_subsystem(self) -> Dict[str, float]:
        """Calculate mass breakdown by subsystem type."""
        breakdown = {}
        for comp in self.components:
            subsys = comp.component_type.value
            breakdown[subsys] = breakdown.get(subsys, 0.0) + comp.mass
        return breakdown
    
    def calculate_power_by_subsystem(self, mode: str = 'active') -> Dict[str, float]:
        """Calculate power breakdown by subsystem type."""
        breakdown = {}
        for comp in self.components:
            subsys = comp.component_type.value
            power = comp.active_power if mode == 'active' else comp.passive_power
            breakdown[subsys] = breakdown.get(subsys, 0.0) + power
        return breakdown
    
    def verify_mass_constraint(self, max_mass: float) -> Tuple[bool, float]:
        """Verify spacecraft mass against constraint."""
        total_mass = self.calculate_total_mass(include_margin=True)
        return (total_mass <= max_mass, total_mass)
    
    def verify_power_constraint(self, max_power: float, mode: str = 'active') -> Tuple[bool, float]:
        """Verify power consumption against constraint."""
        total_power = self.calculate_total_power(mode=mode, include_margin=True)
        return (total_power <= max_power, total_power)
    
    def verify_cost_constraint(self, max_cost: float) -> Tuple[bool, float]:
        """Verify component cost against constraint."""
        total_cost = self.calculate_total_cost(include_margin=True)
        return (total_cost <= max_cost, total_cost)


# ============================================================================
# OBJECTIVES (SMAD STEP 1 & 2)
# ============================================================================

@dataclass
class PerformanceThreshold:
    """Performance threshold level (threshold/baseline/target)."""
    level: str  # "threshold", "baseline", "target"
    value: float
    unit: Unit
    operator: ComparisonOperator
    description: str = ""
    
    def evaluate(self, actual_value: float) -> bool:
        """Check if actual value meets threshold."""
        if self.operator == ComparisonOperator.LESS_THAN:
            return actual_value < self.value
        elif self.operator == ComparisonOperator.LESS_THAN_OR_EQUAL:
            return actual_value <= self.value
        elif self.operator == ComparisonOperator.EQUAL:
            return actual_value == self.value
        elif self.operator == ComparisonOperator.GREATER_THAN_OR_EQUAL:
            return actual_value >= self.value
        elif self.operator == ComparisonOperator.GREATER_THAN:
            return actual_value > self.value
        elif self.operator == ComparisonOperator.NOT_EQUAL:
            return actual_value != self.value
        return False


@dataclass
class KeyPerformanceIndicator:
    """KPI - measurable metric for objective validation (SMAD Step 2)."""
    id: str
    name: str
    description: str
    unit: Unit
    thresholds: List[PerformanceThreshold] = field(default_factory=list)
    measurement_method: str = ""
    data_sources: List[str] = field(default_factory=list)
    aggregation_method: AggregationMethod = AggregationMethod.AVERAGE
    weight: float = 1.0
    current_value: Optional[float] = None
    status: ObjectiveStatus = ObjectiveStatus.NOT_EVALUATED
    geographic_region: Optional[GeographicRegion] = None
    notes: str = ""
    
    def add_threshold(self, threshold: PerformanceThreshold):
        self.thresholds.append(threshold)
    
    def get_threshold(self, level: str) -> Optional[PerformanceThreshold]:
        for t in self.thresholds:
            if t.level.lower() == level.lower():
                return t
        return None
    
    def evaluate_performance(self, actual_value: float) -> ObjectiveStatus:
        """Evaluate performance against thresholds."""
        self.current_value = actual_value
        target = self.get_threshold("target")
        baseline = self.get_threshold("baseline")
        threshold = self.get_threshold("threshold")
        
        if target and target.evaluate(actual_value):
            self.status = ObjectiveStatus.TARGET_MET
        elif baseline and baseline.evaluate(actual_value):
            self.status = ObjectiveStatus.BASELINE_MET
        elif threshold and threshold.evaluate(actual_value):
            self.status = ObjectiveStatus.THRESHOLD_MET
        else:
            self.status = ObjectiveStatus.BELOW_THRESHOLD
        return self.status
    
    def __str__(self) -> str:
        status_str = f" [{self.status.value}]" if self.status != ObjectiveStatus.NOT_EVALUATED else ""
        value_str = f" = {self.current_value} {self.unit.value}" if self.current_value is not None else ""
        return f"{self.name}{value_str}{status_str}"


@dataclass
class FigureOfMerit:
    """Figure of Merit - aggregates multiple KPIs."""
    id: str
    name: str
    description: str
    kpis: List[str] = field(default_factory=list)
    calculation_method: str = ""
    unit: Unit = Unit.UNITLESS
    weight: float = 1.0
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    notes: str = ""
    
    def calculate(self, kpi_values: dict) -> float:
        """Calculate FoM from KPI values (simple average)."""
        if not self.kpis:
            return 0.0
        total = sum(kpi_values.get(kpi_id, 0) for kpi_id in self.kpis if kpi_id in kpi_values)
        count = sum(1 for kpi_id in self.kpis if kpi_id in kpi_values)
        self.current_value = total / count if count > 0 else 0.0
        return self.current_value


@dataclass
class QuantitativeObjective:
    """Quantitative objective with KPIs (SMAD Step 2)."""
    id: str
    qualitative_objective_id: str
    title: str
    description: str
    kpis: List[KeyPerformanceIndicator] = field(default_factory=list)
    figures_of_merit: List[FigureOfMerit] = field(default_factory=list)
    success_criteria: str = ""
    minimum_threshold: str = ""
    derived_requirements: List[str] = field(default_factory=list)
    priority: Priority = Priority.MEDIUM
    created_date: datetime = field(default_factory=datetime.now)
    notes: str = ""
    
    def add_kpi(self, kpi: KeyPerformanceIndicator):
        self.kpis.append(kpi)
    
    def add_figure_of_merit(self, fom: FigureOfMerit):
        self.figures_of_merit.append(fom)
    
    def evaluate_objective(self) -> ObjectiveStatus:
        """Evaluate overall status (minimum of all KPIs)."""
        if not self.kpis:
            return ObjectiveStatus.NOT_EVALUATED
        
        status_values = {
            ObjectiveStatus.EXCEEDED: 5, ObjectiveStatus.TARGET_MET: 4,
            ObjectiveStatus.BASELINE_MET: 3, ObjectiveStatus.THRESHOLD_MET: 2,
            ObjectiveStatus.BELOW_THRESHOLD: 1, ObjectiveStatus.NOT_EVALUATED: 0
        }
        
        min_status = ObjectiveStatus.EXCEEDED
        min_value = 6
        for kpi in self.kpis:
            value = status_values.get(kpi.status, 0)
            if value < min_value:
                min_value = value
                min_status = kpi.status
        return min_status


@dataclass
class MissionObjective:
    """Qualitative mission objective (SMAD Step 1)."""
    id: str
    title: str
    description: str
    priority: Priority = Priority.MEDIUM
    category: str = ""
    stakeholders: List[str] = field(default_factory=list)
    quantitative_objectives: List[QuantitativeObjective] = field(default_factory=list)
    created_date: datetime = field(default_factory=datetime.now)
    notes: str = ""
    
    def add_quantitative_objective(self, quant_obj: QuantitativeObjective):
        self.quantitative_objectives.append(quant_obj)
    
    def get_all_kpis(self) -> List[KeyPerformanceIndicator]:
        all_kpis = []
        for qo in self.quantitative_objectives:
            all_kpis.extend(qo.kpis)
        return all_kpis
    
    def evaluate_objective(self) -> ObjectiveStatus:
        if not self.quantitative_objectives:
            return ObjectiveStatus.NOT_EVALUATED
        
        status_values = {
            ObjectiveStatus.EXCEEDED: 5, ObjectiveStatus.TARGET_MET: 4,
            ObjectiveStatus.BASELINE_MET: 3, ObjectiveStatus.THRESHOLD_MET: 2,
            ObjectiveStatus.BELOW_THRESHOLD: 1, ObjectiveStatus.NOT_EVALUATED: 0
        }
        
        min_status = ObjectiveStatus.EXCEEDED
        min_value = 6
        for qo in self.quantitative_objectives:
            status = qo.evaluate_objective()
            value = status_values.get(status, 0)
            if value < min_value:
                min_value = value
                min_status = status
        return min_status


# ============================================================================
# REQUIREMENTS
# ============================================================================

@dataclass
class Requirement:
    """Base class for requirements."""
    id: str
    title: str
    requirement_type: RequirementType
    constraint: NumericConstraintValue
    priority: Priority = Priority.MEDIUM
    rationale: str = ""
    derived_from_objectives: List[str] = field(default_factory=list)
    verification_method: str = ""
    notes: str = ""
    
    def verify(self, actual_value: float) -> bool:
        return self.constraint.evaluate(actual_value)


@dataclass
class SpatialResolutionRequirement(Requirement):
    """Spatial resolution (GSD) requirement."""
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        if constraint.unit not in [Unit.METERS, Unit.KILOMETERS, Unit.CENTIMETERS]:
            raise ValueError("Spatial resolution must use distance units")
        super().__init__(id=id, title=title, requirement_type=RequirementType.SPATIAL_RESOLUTION,
                        constraint=constraint, **kwargs)


@dataclass
class TemporalResolutionRequirement(Requirement):
    """Temporal resolution (revisit rate) for geographic region."""
    geographic_region: Optional[GeographicRegion] = None
    
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue,
                 geographic_region: Optional[GeographicRegion] = None, **kwargs):
        if constraint.unit not in [Unit.DAYS, Unit.HOURS, Unit.MINUTES]:
            raise ValueError("Temporal resolution must use time units")
        super().__init__(id=id, title=title, requirement_type=RequirementType.TEMPORAL_RESOLUTION,
                        constraint=constraint, **kwargs)
        self.geographic_region = geographic_region or GeographicRegion.create_global()


@dataclass
class SpectralResolutionRequirement(Requirement):
    """Spectral resolution requirement."""
    spectral_bands: List[dict] = field(default_factory=list)
    
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        if constraint.unit not in [Unit.NANOMETERS, Unit.MICROMETERS, Unit.COUNT]:
            raise ValueError("Spectral resolution must use wavelength or count units")
        spectral_bands = kwargs.pop('spectral_bands', [])
        super().__init__(id=id, title=title, requirement_type=RequirementType.SPECTRAL_RESOLUTION,
                        constraint=constraint, **kwargs)
        self.spectral_bands = spectral_bands


@dataclass
class RadiometricResolutionRequirement(Requirement):
    """Radiometric resolution (bit depth) requirement."""
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        if constraint.unit not in [Unit.BITS, Unit.COUNT]:
            raise ValueError("Radiometric resolution must use bits or count")
        super().__init__(id=id, title=title, requirement_type=RequirementType.RADIOMETRIC_RESOLUTION,
                        constraint=constraint, **kwargs)


@dataclass
class SwathWidthRequirement(Requirement):
    """Swath width requirement."""
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        if constraint.unit not in [Unit.KILOMETERS, Unit.METERS]:
            raise ValueError("Swath width must use distance units")
        super().__init__(id=id, title=title, requirement_type=RequirementType.SWATH_WIDTH,
                        constraint=constraint, **kwargs)


@dataclass
class CoverageAreaRequirement(Requirement):
    """Coverage area requirement with geographic region."""
    geographic_region: Optional[GeographicRegion] = None
    coverage_percentage: Optional[float] = None
    
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue,
                 geographic_region: Optional[GeographicRegion] = None,
                 coverage_percentage: Optional[float] = None, **kwargs):
        if constraint.unit not in [Unit.PERCENT, Unit.KILOMETERS]:
            raise ValueError("Coverage area must use percent or area units")
        super().__init__(id=id, title=title, requirement_type=RequirementType.COVERAGE_AREA,
                        constraint=constraint, **kwargs)
        self.geographic_region = geographic_region or GeographicRegion.create_global()
        self.coverage_percentage = coverage_percentage


@dataclass
class DataLatencyRequirement(Requirement):
    """Data latency requirement."""
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        if constraint.unit not in [Unit.HOURS, Unit.MINUTES, Unit.DAYS]:
            raise ValueError("Data latency must use time units")
        super().__init__(id=id, title=title, requirement_type=RequirementType.DATA_LATENCY,
                        constraint=constraint, **kwargs)


# ============================================================================
# CONSTRAINTS
# ============================================================================

@dataclass
class Constraint:
    """Base class for constraints."""
    id: str
    title: str
    constraint_type: ConstraintType
    constraint: NumericConstraintValue
    priority: Priority = Priority.MEDIUM
    rationale: str = ""
    is_negotiable: bool = False
    impacts: List[str] = field(default_factory=list)
    notes: str = ""
    
    def verify(self, actual_value: float) -> bool:
        return self.constraint.evaluate(actual_value)


@dataclass
class BudgetConstraint(Constraint):
    """Budget constraint."""
    phase: str = "total"
    
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        if constraint.unit not in [Unit.USD, Unit.EUR]:
            raise ValueError("Budget must use currency units")
        phase = kwargs.pop('phase', 'total')
        super().__init__(id=id, title=title, constraint_type=ConstraintType.BUDGET,
                        constraint=constraint, **kwargs)
        self.phase = phase


@dataclass
class OrbitalConstraint(Constraint):
    """Orbital parameter constraint."""
    parameter: str = ""
    
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        parameter = kwargs.pop('parameter', '')
        super().__init__(id=id, title=title, constraint_type=ConstraintType.ORBITAL,
                        constraint=constraint, **kwargs)
        self.parameter = parameter


@dataclass
class MassConstraint(Constraint):
    """Mass constraint."""
    component: str = "total"
    
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        if constraint.unit not in [Unit.KILOGRAMS, Unit.GRAMS, Unit.TONNES]:
            raise ValueError("Mass must use mass units")
        component = kwargs.pop('component', 'total')
        super().__init__(id=id, title=title, constraint_type=ConstraintType.MASS,
                        constraint=constraint, **kwargs)
        self.component = component


@dataclass
class PowerConstraint(Constraint):
    """Power constraint."""
    mode: str = "nominal"
    
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        if constraint.unit not in [Unit.WATTS, Unit.KILOWATTS]:
            raise ValueError("Power must use power units")
        mode = kwargs.pop('mode', 'nominal')
        super().__init__(id=id, title=title, constraint_type=ConstraintType.POWER,
                        constraint=constraint, **kwargs)
        self.mode = mode


@dataclass
class ScheduleConstraint(Constraint):
    """Schedule constraint."""
    milestone: str = ""
    
    def __init__(self, id: str, title: str, constraint: NumericConstraintValue, **kwargs):
        if constraint.unit not in [Unit.DAYS, Unit.YEARS]:
            raise ValueError("Schedule must use time units")
        milestone = kwargs.pop('milestone', '')
        super().__init__(id=id, title=title, constraint_type=ConstraintType.SCHEDULE,
                        constraint=constraint, **kwargs)
        self.milestone = milestone


# ============================================================================
# DESIGN SOLUTION AND EVALUATION TRACKING
# ============================================================================

@dataclass
class DesignSolution:
    """A proposed spacecraft + orbit combination solution."""
    id: str
    name: str
    label: str  # e.g., "Baseline", "Alternative A", "Trade Option 1"
    spacecraft: Spacecraft
    orbit: Orbit
    status: SolutionStatus = SolutionStatus.PROPOSED
    created_date: datetime = field(default_factory=datetime.now)
    notes: str = ""
    
    def __str__(self) -> str:
        return f"{self.label}: {self.spacecraft.name} in {self.orbit.label}"


@dataclass
class KPIEvaluation:
    """Evaluation result for a specific KPI."""
    kpi_id: str
    kpi_name: str
    calculated_value: float
    unit: Unit
    status: ObjectiveStatus
    threshold_met: bool
    baseline_met: bool
    target_met: bool
    notes: str = ""


@dataclass
class RequirementVerification:
    """Verification result for a specific requirement."""
    requirement_id: str
    requirement_title: str
    required_value: str  # String representation of constraint
    calculated_value: float
    unit: Unit
    verified: bool
    margin: float  # How much margin (positive) or deficit (negative)
    notes: str = ""


@dataclass
class ConstraintVerification:
    """Verification result for a specific constraint."""
    constraint_id: str
    constraint_title: str
    constraint_value: str  # String representation of constraint
    calculated_value: float
    unit: Unit
    verified: bool
    margin: float  # How much margin (positive) or deficit (negative)
    is_negotiable: bool
    notes: str = ""


@dataclass
class FOMEvaluation:
    """Evaluation result for a Figure of Merit."""
    fom_id: str
    fom_name: str
    calculated_value: float
    target_value: Optional[float]
    meets_target: bool
    contributing_kpis: Dict[str, float]  # kpi_id -> value
    notes: str = ""


@dataclass
class SolutionEvaluation:
    """Complete evaluation of a design solution against mission objectives."""
    id: str
    solution_id: str
    solution_label: str
    evaluation_date: datetime = field(default_factory=datetime.now)
    
    # KPI Evaluations
    kpi_evaluations: Dict[str, KPIEvaluation] = field(default_factory=dict)
    
    # Figure of Merit Evaluations
    fom_evaluations: Dict[str, FOMEvaluation] = field(default_factory=dict)
    
    # Requirement Verifications
    requirement_verifications: Dict[str, RequirementVerification] = field(default_factory=dict)
    
    # Constraint Verifications
    constraint_verifications: Dict[str, ConstraintVerification] = field(default_factory=dict)
    
    # Overall Status
    all_requirements_met: bool = False
    all_critical_constraints_met: bool = False
    overall_status: SolutionStatus = SolutionStatus.UNDER_EVALUATION
    
    # Performance Scores
    kpi_success_rate: float = 0.0  # Percentage of KPIs meeting threshold
    requirement_success_rate: float = 0.0  # Percentage of requirements verified
    constraint_success_rate: float = 0.0  # Percentage of constraints satisfied
    
    # Summary
    summary_notes: str = ""
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    
    def add_kpi_evaluation(self, kpi_eval: KPIEvaluation):
        """Add KPI evaluation result."""
        self.kpi_evaluations[kpi_eval.kpi_id] = kpi_eval
    
    def add_fom_evaluation(self, fom_eval: FOMEvaluation):
        """Add FOM evaluation result."""
        self.fom_evaluations[fom_eval.fom_id] = fom_eval
    
    def add_requirement_verification(self, req_ver: RequirementVerification):
        """Add requirement verification result."""
        self.requirement_verifications[req_ver.requirement_id] = req_ver
    
    def add_constraint_verification(self, const_ver: ConstraintVerification):
        """Add constraint verification result."""
        self.constraint_verifications[const_ver.constraint_id] = const_ver
    
    def calculate_success_rates(self):
        """Calculate overall success rates."""
        # KPI success rate
        if self.kpi_evaluations:
            kpi_success = sum(1 for kpi in self.kpi_evaluations.values() 
                            if kpi.threshold_met)
            self.kpi_success_rate = (kpi_success / len(self.kpi_evaluations)) * 100
        
        # Requirement success rate
        if self.requirement_verifications:
            req_success = sum(1 for req in self.requirement_verifications.values() 
                            if req.verified)
            self.requirement_success_rate = (req_success / len(self.requirement_verifications)) * 100
            self.all_requirements_met = (req_success == len(self.requirement_verifications))
        
        # Constraint success rate
        if self.constraint_verifications:
            const_success = sum(1 for const in self.constraint_verifications.values() 
                              if const.verified)
            self.constraint_success_rate = (const_success / len(self.constraint_verifications)) * 100
            
            critical_constraints = [c for c in self.constraint_verifications.values() 
                                  if not c.is_negotiable]
            if critical_constraints:
                critical_met = sum(1 for c in critical_constraints if c.verified)
                self.all_critical_constraints_met = (critical_met == len(critical_constraints))
    
    def determine_overall_status(self):
        """Determine overall solution status."""
        self.calculate_success_rates()
        
        if self.all_requirements_met and self.all_critical_constraints_met:
            self.overall_status = SolutionStatus.REQUIREMENTS_MET
        elif not self.all_requirements_met or not self.all_critical_constraints_met:
            self.overall_status = SolutionStatus.REQUIREMENTS_NOT_MET
    
    def generate_summary(self) -> str:
        """Generate evaluation summary report."""
        s = f"\nEvaluation Summary: {self.solution_label}\n"
        s += "=" * 70 + "\n"
        s += f"Evaluation Date: {self.evaluation_date.strftime('%Y-%m-%d %H:%M')}\n"
        s += f"Overall Status: {self.overall_status.value}\n\n"
        
        s += "Performance Scores:\n"
        s += f"  KPI Success Rate: {self.kpi_success_rate:.1f}%\n"
        s += f"  Requirement Verification: {self.requirement_success_rate:.1f}%\n"
        s += f"  Constraint Satisfaction: {self.constraint_success_rate:.1f}%\n\n"
        
        if self.strengths:
            s += "Strengths:\n"
            for strength in self.strengths:
                s += f"  + {strength}\n"
            s += "\n"
        
        if self.weaknesses:
            s += "Weaknesses:\n"
            for weakness in self.weaknesses:
                s += f"  - {weakness}\n"
            s += "\n"
        
        if self.recommendations:
            s += "Recommendations:\n"
            for rec in self.recommendations:
                s += f"  → {rec}\n"
            s += "\n"
        
        return s


@dataclass
class DesignIteration:
    """Represents one iteration in the design process."""
    iteration_number: int
    solution: DesignSolution
    evaluation: SolutionEvaluation
    created_date: datetime = field(default_factory=datetime.now)
    iteration_notes: str = ""
    changes_from_previous: str = ""


# ============================================================================
# MISSION (Updated with Solution Tracking)
# ============================================================================

@dataclass
class Mission:
    """Top-level mission container with design iteration tracking."""
    id: str
    name: str
    description: str
    mission_type: str = "Earth Observation"
    objectives: List[MissionObjective] = field(default_factory=list)
    requirements: List[Requirement] = field(default_factory=list)
    constraints: List[Constraint] = field(default_factory=list)
    
    # Design Solutions
    design_solutions: List[DesignSolution] = field(default_factory=list)
    solution_evaluations: Dict[str, SolutionEvaluation] = field(default_factory=dict)  # solution_id -> evaluation
    design_iterations: List[DesignIteration] = field(default_factory=list)
    
    # Selected/Baseline Solutions
    baseline_solution_id: Optional[str] = None
    selected_solution_id: Optional[str] = None
    
    created_date: datetime = field(default_factory=datetime.now)
    last_modified: datetime = field(default_factory=datetime.now)
    
    def add_objective(self, objective: MissionObjective):
        self.objectives.append(objective)
        self.last_modified = datetime.now()
    
    def add_requirement(self, requirement: Requirement):
        self.requirements.append(requirement)
        self.last_modified = datetime.now()
    
    def add_constraint(self, constraint: Constraint):
        self.constraints.append(constraint)
        self.last_modified = datetime.now()
    
    def add_design_solution(self, solution: DesignSolution) -> str:
        """Add a design solution to the mission."""
        self.design_solutions.append(solution)
        self.last_modified = datetime.now()
        return solution.id
    
    def get_design_solution(self, solution_id: str) -> Optional[DesignSolution]:
        """Retrieve a design solution by ID."""
        for sol in self.design_solutions:
            if sol.id == solution_id:
                return sol
        return None
    
    def evaluate_solution(self, solution_id: str) -> SolutionEvaluation:
        """Evaluate a design solution against all requirements and objectives."""
        solution = self.get_design_solution(solution_id)
        if not solution:
            raise ValueError(f"Solution {solution_id} not found")
        
        eval_id = f"EVAL-{solution_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        evaluation = SolutionEvaluation(
            id=eval_id,
            solution_id=solution.id,
            solution_label=solution.label
        )
        
        # Store the evaluation
        self.solution_evaluations[solution.id] = evaluation
        self.last_modified = datetime.now()
        
        return evaluation
    
    def add_design_iteration(self, solution: DesignSolution, evaluation: SolutionEvaluation,
                           changes: str = "", notes: str = "") -> DesignIteration:
        """Add a new design iteration."""
        iteration_num = len(self.design_iterations) + 1
        iteration = DesignIteration(
            iteration_number=iteration_num,
            solution=solution,
            evaluation=evaluation,
            iteration_notes=notes,
            changes_from_previous=changes
        )
        self.design_iterations.append(iteration)
        self.last_modified = datetime.now()
        return iteration
    
    def set_baseline_solution(self, solution_id: str):
        """Set a solution as the baseline."""
        solution = self.get_design_solution(solution_id)
        if solution:
            self.baseline_solution_id = solution_id
            self.last_modified = datetime.now()
    
    def set_selected_solution(self, solution_id: str):
        """Set a solution as the selected final design."""
        solution = self.get_design_solution(solution_id)
        if solution:
            self.selected_solution_id = solution_id
            solution.status = SolutionStatus.SELECTED
            self.last_modified = datetime.now()
    
    def get_requirements_by_type(self, req_type: RequirementType) -> List[Requirement]:
        return [r for r in self.requirements if r.requirement_type == req_type]
    
    def get_constraints_by_type(self, const_type: ConstraintType) -> List[Constraint]:
        return [c for c in self.constraints if c.constraint_type == const_type]
    
    def verify_requirement(self, requirement_id: str, actual_value: float) -> bool:
        req = next((r for r in self.requirements if r.id == requirement_id), None)
        return req.verify(actual_value) if req else False
    
    def verify_constraint(self, constraint_id: str, actual_value: float) -> bool:
        const = next((c for c in self.constraints if c.id == constraint_id), None)
        return const.verify(actual_value) if const else False
    
    def compare_solutions(self, solution_ids: List[str]) -> str:
        """Generate comparison report for multiple solutions."""
        s = "\n" + "=" * 80 + "\n"
        s += "DESIGN SOLUTION COMPARISON\n"
        s += "=" * 80 + "\n\n"
        
        solutions = [self.get_design_solution(sid) for sid in solution_ids if self.get_design_solution(sid)]
        if not solutions:
            return "No solutions found for comparison."
        
        s += f"Comparing {len(solutions)} solutions:\n"
        for sol in solutions:
            s += f"  - {sol.label}\n"
        s += "\n"
        
        # Compare evaluations
        for sol in solutions:
            if sol.id in self.solution_evaluations:
                eval = self.solution_evaluations[sol.id]
                s += f"\n{sol.label}:\n"
                s += f"  Status: {eval.overall_status.value}\n"
                s += f"  KPI Success: {eval.kpi_success_rate:.1f}%\n"
                s += f"  Requirements Met: {eval.requirement_success_rate:.1f}%\n"
                s += f"  Constraints Satisfied: {eval.constraint_success_rate:.1f}%\n"
        
        return s
    
    def summary(self) -> str:
        s = f"Mission: {self.name}\n{self.description}\n"
        s += f"\nObjectives ({len(self.objectives)}):\n"
        for obj in self.objectives:
            s += f"  - {obj.title}\n"
        s += f"\nRequirements ({len(self.requirements)}):\n"
        for req in self.requirements:
            s += f"  - {req.title}\n"
        s += f"\nConstraints ({len(self.constraints)}):\n"
        for const in self.constraints:
            s += f"  - {const.title}\n"
        s += f"\nDesign Solutions ({len(self.design_solutions)}):\n"
        for sol in self.design_solutions:
            s += f"  - {sol.label} ({sol.status.value})\n"
        s += f"\nDesign Iterations: {len(self.design_iterations)}\n"
        if self.selected_solution_id:
            sel_sol = self.get_design_solution(self.selected_solution_id)
            s += f"Selected Solution: {sel_sol.label if sel_sol else 'None'}\n"
        return s
