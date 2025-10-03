"""
SMAD Mission Data Model - REST API
===================================
Flask REST API for managing SMAD missions, objectives, requirements, and design iterations.

Usage:
    python smad_rest_api.py

API will be available at: http://localhost:5000
"""

from flask import Flask, request, jsonify
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
from smad_data_model import *

app = Flask(__name__)

# In-memory storage (use database in production)
missions: Dict[str, Mission] = {}


# ============================================================================
# SERIALIZATION UTILITIES
# ============================================================================

def serialize_enum(enum_val) -> str:
    """Serialize enum to string."""
    return enum_val.value if enum_val else None


def deserialize_enum(enum_class, value: str):
    """Deserialize string to enum."""
    if value is None:
        return None
    for item in enum_class:
        if item.value == value:
            return item
    raise ValueError(f"Invalid {enum_class.__name__}: {value}")


def serialize_datetime(dt: datetime) -> str:
    """Serialize datetime to ISO format."""
    return dt.isoformat() if dt else None


def deserialize_datetime(dt_str: str) -> datetime:
    """Deserialize ISO format string to datetime."""
    return datetime.fromisoformat(dt_str) if dt_str else datetime.now()


def serialize_constraint_value(constraint: NumericConstraintValue) -> Dict[str, Any]:
    """Serialize NumericConstraintValue."""
    return {
        "operator": serialize_enum(constraint.operator),
        "value": constraint.value,
        "min_value": constraint.min_value,
        "max_value": constraint.max_value,
        "unit": serialize_enum(constraint.unit)
    }


def deserialize_constraint_value(data: Dict[str, Any]) -> NumericConstraintValue:
    """Deserialize NumericConstraintValue."""
    return NumericConstraintValue(
        operator=deserialize_enum(ComparisonOperator, data["operator"]),
        value=data.get("value"),
        min_value=data.get("min_value"),
        max_value=data.get("max_value"),
        unit=deserialize_enum(Unit, data["unit"])
    )


def serialize_component(component: Component) -> Dict[str, Any]:
    """Serialize Component."""
    data = {
        "id": component.id,
        "name": component.name,
        "component_type": serialize_enum(component.component_type),
        "active_power": component.active_power,
        "passive_power": component.passive_power,
        "mass": component.mass,
        "cost": component.cost,
        "manufacturer": component.manufacturer,
        "technology_readiness_level": component.technology_readiness_level,
        "heritage": component.heritage,
        "properties": component.properties,
        "notes": component.notes
    }
    
    # Add payload-specific fields if it's a PayloadInstrument
    if isinstance(component, PayloadInstrument):
        data["payload_data"] = {
            "focal_length": component.focal_length,
            "aperture_diameter": component.aperture_diameter,
            "f_number": component.f_number,
            "detector_type": component.detector_type,
            "detector_array_size_along_track": component.detector_array_size_along_track,
            "detector_array_size_across_track": component.detector_array_size_across_track,
            "pixel_pitch": component.pixel_pitch,
            "spectral_bands": [
                {
                    "name": b.name,
                    "center_wavelength": b.center_wavelength,
                    "bandwidth": b.bandwidth,
                    "purpose": b.purpose
                } for b in component.spectral_bands
            ],
            "ground_sample_distance": component.ground_sample_distance,
            "swath_width": component.swath_width,
            "signal_to_noise_ratio": component.signal_to_noise_ratio,
            "radiometric_resolution": component.radiometric_resolution,
            "integration_time": component.integration_time,
            "duty_cycle": component.duty_cycle,
            "data_rate": component.data_rate,
            "quantization": component.quantization
        }
    
    return data


def deserialize_component(data: Dict[str, Any]) -> Component:
    """Deserialize Component."""
    comp_type = deserialize_enum(ComponentType, data["component_type"])
    
    # Create appropriate component type
    if comp_type == ComponentType.PAYLOAD_INSTRUMENT and "payload_data" in data:
        pd = data["payload_data"]
        bands = [SpectralBand(**b) for b in pd.get("spectral_bands", [])]
        
        return PayloadInstrument(
            id=data["id"],
            name=data["name"],
            active_power=data["active_power"],
            passive_power=data["passive_power"],
            mass=data["mass"],
            cost=data["cost"],
            manufacturer=data.get("manufacturer", ""),
            technology_readiness_level=data.get("technology_readiness_level", 9),
            heritage=data.get("heritage", ""),
            focal_length=pd.get("focal_length", 0.0),
            aperture_diameter=pd.get("aperture_diameter", 0.0),
            detector_type=pd.get("detector_type", "CCD"),
            detector_array_size_along_track=pd.get("detector_array_size_along_track", 0),
            detector_array_size_across_track=pd.get("detector_array_size_across_track", 0),
            pixel_pitch=pd.get("pixel_pitch", 0.0),
            spectral_bands=bands,
            ground_sample_distance=pd.get("ground_sample_distance", 0.0),
            swath_width=pd.get("swath_width", 0.0),
            signal_to_noise_ratio=pd.get("signal_to_noise_ratio", 0.0),
            radiometric_resolution=pd.get("radiometric_resolution", 12)
        )
    elif comp_type == ComponentType.ELECTRIC_POWER_SYSTEM:
        comp = EPSComponent(
            id=data["id"],
            name=data["name"],
            active_power=data["active_power"],
            passive_power=data["passive_power"],
            mass=data["mass"],
            cost=data["cost"]
        )
    elif comp_type == ComponentType.ADCS:
        comp = ADCSComponent(
            id=data["id"],
            name=data["name"],
            active_power=data["active_power"],
            passive_power=data["passive_power"],
            mass=data["mass"],
            cost=data["cost"]
        )
    elif comp_type == ComponentType.COMMUNICATIONS:
        comp = CommunicationsComponent(
            id=data["id"],
            name=data["name"],
            active_power=data["active_power"],
            passive_power=data["passive_power"],
            mass=data["mass"],
            cost=data["cost"]
        )
    else:
        comp = Component(
            id=data["id"],
            name=data["name"],
            component_type=comp_type,
            active_power=data["active_power"],
            passive_power=data["passive_power"],
            mass=data["mass"],
            cost=data["cost"]
        )
    
    comp.manufacturer = data.get("manufacturer", "")
    comp.technology_readiness_level = data.get("technology_readiness_level", 9)
    comp.heritage = data.get("heritage", "")
    comp.properties = data.get("properties", {})
    comp.notes = data.get("notes", "")
    
    return comp


def serialize_spacecraft(spacecraft: Spacecraft) -> Dict[str, Any]:
    """Serialize Spacecraft."""
    return {
        "id": spacecraft.id,
        "name": spacecraft.name,
        "components": [serialize_component(c) for c in spacecraft.components],
        "dry_mass_margin": spacecraft.dry_mass_margin,
        "power_margin": spacecraft.power_margin,
        "cost_margin": spacecraft.cost_margin,
        "design_life": spacecraft.design_life
    }


def deserialize_spacecraft(data: Dict[str, Any]) -> Spacecraft:
    """Deserialize Spacecraft."""
    spacecraft = Spacecraft(
        id=data["id"],
        name=data["name"],
        dry_mass_margin=data.get("dry_mass_margin", 20.0),
        power_margin=data.get("power_margin", 30.0),
        cost_margin=data.get("cost_margin", 25.0),
        design_life=data.get("design_life", 5.0)
    )
    
    for comp_data in data.get("components", []):
        spacecraft.add_component(deserialize_component(comp_data))
    
    return spacecraft


def serialize_orbit(orbit: Orbit) -> Dict[str, Any]:
    """Serialize Orbit."""
    return {
        "id": orbit.id,
        "name": orbit.name,
        "label": orbit.label,
        "semi_major_axis": orbit.semi_major_axis,
        "eccentricity": orbit.eccentricity,
        "inclination": orbit.inclination,
        "raan": orbit.raan,
        "argument_of_perigee": orbit.argument_of_perigee,
        "true_anomaly": orbit.true_anomaly,
        "epoch": serialize_datetime(orbit.epoch),
        "altitude": orbit.altitude,
        "perigee_altitude": orbit.perigee_altitude,
        "apogee_altitude": orbit.apogee_altitude,
        "orbital_period": orbit.orbital_period,
        "mean_motion": orbit.mean_motion,
        "local_time_ascending_node": orbit.local_time_ascending_node,
        "is_sun_synchronous": orbit.is_sun_synchronous,
        "revisit_time_global": orbit.revisit_time_global,
        "coverage_per_day": orbit.coverage_per_day,
        "ground_track_repeat_cycle": orbit.ground_track_repeat_cycle,
        "orbital_lifetime": orbit.orbital_lifetime,
        "delta_v_deorbit": orbit.delta_v_deorbit,
        "properties": orbit.properties,
        "notes": orbit.notes
    }


def deserialize_orbit(data: Dict[str, Any]) -> Orbit:
    """Deserialize Orbit."""
    return Orbit(
        id=data["id"],
        name=data["name"],
        label=data["label"],
        semi_major_axis=data["semi_major_axis"],
        eccentricity=data.get("eccentricity", 0.0),
        inclination=data.get("inclination", 0.0),
        raan=data.get("raan", 0.0),
        argument_of_perigee=data.get("argument_of_perigee", 0.0),
        true_anomaly=data.get("true_anomaly", 0.0),
        epoch=deserialize_datetime(data.get("epoch")),
        altitude=data.get("altitude"),
        is_sun_synchronous=data.get("is_sun_synchronous", False),
        local_time_ascending_node=data.get("local_time_ascending_node"),
        revisit_time_global=data.get("revisit_time_global"),
        coverage_per_day=data.get("coverage_per_day"),
        orbital_lifetime=data.get("orbital_lifetime"),
        notes=data.get("notes", "")
    )


def serialize_requirement(req: Requirement) -> Dict[str, Any]:
    """Serialize Requirement."""
    data = {
        "id": req.id,
        "title": req.title,
        "requirement_type": serialize_enum(req.requirement_type),
        "constraint": serialize_constraint_value(req.constraint),
        "priority": serialize_enum(req.priority),
        "rationale": req.rationale,
        "derived_from_objectives": req.derived_from_objectives,
        "verification_method": req.verification_method,
        "notes": req.notes
    }
    
    # Add type-specific fields
    if isinstance(req, TemporalResolutionRequirement):
        data["geographic_region"] = req.geographic_region.name if req.geographic_region else None
    elif isinstance(req, SpectralResolutionRequirement):
        data["spectral_bands"] = req.spectral_bands
    elif isinstance(req, CoverageAreaRequirement):
        data["geographic_region"] = req.geographic_region.name if req.geographic_region else None
        data["coverage_percentage"] = req.coverage_percentage
    
    return data


def serialize_constraint(const: Constraint) -> Dict[str, Any]:
    """Serialize Constraint."""
    data = {
        "id": const.id,
        "title": const.title,
        "constraint_type": serialize_enum(const.constraint_type),
        "constraint": serialize_constraint_value(const.constraint),
        "priority": serialize_enum(const.priority),
        "rationale": const.rationale,
        "is_negotiable": const.is_negotiable,
        "impacts": const.impacts,
        "notes": const.notes
    }
    
    # Add type-specific fields
    if isinstance(const, BudgetConstraint):
        data["phase"] = const.phase
    elif isinstance(const, OrbitalConstraint):
        data["parameter"] = const.parameter
    elif isinstance(const, MassConstraint):
        data["component"] = const.component
    elif isinstance(const, PowerConstraint):
        data["mode"] = const.mode
    elif isinstance(const, ScheduleConstraint):
        data["milestone"] = const.milestone
    
    return data


def serialize_mission(mission: Mission) -> Dict[str, Any]:
    """Serialize Mission (summary without full nested objects)."""
    return {
        "id": mission.id,
        "name": mission.name,
        "description": mission.description,
        "mission_type": mission.mission_type,
        "objectives_count": len(mission.objectives),
        "requirements_count": len(mission.requirements),
        "constraints_count": len(mission.constraints),
        "design_solutions_count": len(mission.design_solutions),
        "design_iterations_count": len(mission.design_iterations),
        "baseline_solution_id": mission.baseline_solution_id,
        "selected_solution_id": mission.selected_solution_id,
        "created_date": serialize_datetime(mission.created_date),
        "last_modified": serialize_datetime(mission.last_modified)
    }


# ============================================================================
# MISSION ENDPOINTS
# ============================================================================

@app.route('/api/missions', methods=['POST'])
def create_mission():
    """Create a new mission."""
    data = request.json
    
    mission = Mission(
        id=data["id"],
        name=data["name"],
        description=data["description"],
        mission_type=data.get("mission_type", "Earth Observation")
    )
    
    missions[mission.id] = mission
    
    return jsonify(serialize_mission(mission)), 201


@app.route('/api/missions', methods=['GET'])
def get_missions():
    """Get all missions."""
    return jsonify([serialize_mission(m) for m in missions.values()]), 200


@app.route('/api/missions/<mission_id>', methods=['GET'])
def get_mission(mission_id: str):
    """Get a specific mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    return jsonify(serialize_mission(missions[mission_id])), 200


@app.route('/api/missions/<mission_id>', methods=['PUT'])
def update_mission(mission_id: str):
    """Update mission details."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    data = request.json
    mission = missions[mission_id]
    
    if "name" in data:
        mission.name = data["name"]
    if "description" in data:
        mission.description = data["description"]
    if "mission_type" in data:
        mission.mission_type = data["mission_type"]
    
    mission.last_modified = datetime.now()
    
    return jsonify(serialize_mission(mission)), 200


@app.route('/api/missions/<mission_id>', methods=['DELETE'])
def delete_mission(mission_id: str):
    """Delete a mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    del missions[mission_id]
    return jsonify({"message": "Mission deleted"}), 200


# ============================================================================
# MISSION OBJECTIVES ENDPOINTS
# ============================================================================

@app.route('/api/missions/<mission_id>/objectives', methods=['POST'])
def add_objective(mission_id: str):
    """Add objective to mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    data = request.json
    mission = missions[mission_id]
    
    objective = MissionObjective(
        id=data["id"],
        title=data["title"],
        description=data["description"],
        priority=deserialize_enum(Priority, data.get("priority", "medium")),
        category=data.get("category", ""),
        stakeholders=data.get("stakeholders", []),
        notes=data.get("notes", "")
    )
    
    mission.add_objective(objective)
    
    return jsonify({
        "id": objective.id,
        "title": objective.title,
        "description": objective.description,
        "priority": serialize_enum(objective.priority),
        "category": objective.category,
        "stakeholders": objective.stakeholders
    }), 201


@app.route('/api/missions/<mission_id>/objectives', methods=['GET'])
def get_objectives(mission_id: str):
    """Get all objectives for a mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    
    return jsonify([{
        "id": obj.id,
        "title": obj.title,
        "description": obj.description,
        "priority": serialize_enum(obj.priority),
        "category": obj.category,
        "stakeholders": obj.stakeholders
    } for obj in mission.objectives]), 200


@app.route('/api/missions/<mission_id>/objectives/<objective_id>', methods=['PUT'])
def update_objective(mission_id: str, objective_id: str):
    """Update an objective."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    objective = next((o for o in mission.objectives if o.id == objective_id), None)
    
    if not objective:
        return jsonify({"error": "Objective not found"}), 404
    
    data = request.json
    if "title" in data:
        objective.title = data["title"]
    if "description" in data:
        objective.description = data["description"]
    if "priority" in data:
        objective.priority = deserialize_enum(Priority, data["priority"])
    if "category" in data:
        objective.category = data["category"]
    if "stakeholders" in data:
        objective.stakeholders = data["stakeholders"]
    
    mission.last_modified = datetime.now()
    
    return jsonify({
        "id": objective.id,
        "title": objective.title,
        "description": objective.description,
        "priority": serialize_enum(objective.priority)
    }), 200


@app.route('/api/missions/<mission_id>/objectives/<objective_id>', methods=['DELETE'])
def delete_objective(mission_id: str, objective_id: str):
    """Delete an objective."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    mission.objectives = [o for o in mission.objectives if o.id != objective_id]
    mission.last_modified = datetime.now()
    
    return jsonify({"message": "Objective deleted"}), 200


# ============================================================================
# REQUIREMENTS ENDPOINTS
# ============================================================================

@app.route('/api/missions/<mission_id>/requirements', methods=['POST'])
def add_requirement(mission_id: str):
    """Add requirement to mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    data = request.json
    mission = missions[mission_id]
    
    req_type = deserialize_enum(RequirementType, data["requirement_type"])
    constraint = deserialize_constraint_value(data["constraint"])
    priority = deserialize_enum(Priority, data.get("priority", "medium"))
    
    # Create appropriate requirement type
    kwargs = {
        "id": data["id"],
        "title": data["title"],
        "constraint": constraint,
        "priority": priority,
        "rationale": data.get("rationale", ""),
        "derived_from_objectives": data.get("derived_from_objectives", []),
        "verification_method": data.get("verification_method", ""),
        "notes": data.get("notes", "")
    }
    
    if req_type == RequirementType.SPATIAL_RESOLUTION:
        requirement = SpatialResolutionRequirement(**kwargs)
    elif req_type == RequirementType.TEMPORAL_RESOLUTION:
        requirement = TemporalResolutionRequirement(**kwargs)
    elif req_type == RequirementType.SPECTRAL_RESOLUTION:
        kwargs["spectral_bands"] = data.get("spectral_bands", [])
        requirement = SpectralResolutionRequirement(**kwargs)
    elif req_type == RequirementType.RADIOMETRIC_RESOLUTION:
        requirement = RadiometricResolutionRequirement(**kwargs)
    elif req_type == RequirementType.SWATH_WIDTH:
        requirement = SwathWidthRequirement(**kwargs)
    elif req_type == RequirementType.COVERAGE_AREA:
        kwargs["coverage_percentage"] = data.get("coverage_percentage")
        requirement = CoverageAreaRequirement(**kwargs)
    elif req_type == RequirementType.DATA_LATENCY:
        requirement = DataLatencyRequirement(**kwargs)
    else:
        requirement = Requirement(**kwargs)
    
    mission.add_requirement(requirement)
    
    return jsonify(serialize_requirement(requirement)), 201


@app.route('/api/missions/<mission_id>/requirements', methods=['GET'])
def get_requirements(mission_id: str):
    """Get all requirements for a mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    return jsonify([serialize_requirement(r) for r in mission.requirements]), 200


@app.route('/api/missions/<mission_id>/requirements/<requirement_id>', methods=['PUT'])
def update_requirement(mission_id: str, requirement_id: str):
    """Update a requirement."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    requirement = next((r for r in mission.requirements if r.id == requirement_id), None)
    
    if not requirement:
        return jsonify({"error": "Requirement not found"}), 404
    
    data = request.json
    if "title" in data:
        requirement.title = data["title"]
    if "constraint" in data:
        requirement.constraint = deserialize_constraint_value(data["constraint"])
    if "priority" in data:
        requirement.priority = deserialize_enum(Priority, data["priority"])
    if "rationale" in data:
        requirement.rationale = data["rationale"]
    
    mission.last_modified = datetime.now()
    
    return jsonify(serialize_requirement(requirement)), 200


@app.route('/api/missions/<mission_id>/requirements/<requirement_id>', methods=['DELETE'])
def delete_requirement(mission_id: str, requirement_id: str):
    """Delete a requirement."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    mission.requirements = [r for r in mission.requirements if r.id != requirement_id]
    mission.last_modified = datetime.now()
    
    return jsonify({"message": "Requirement deleted"}), 200


# ============================================================================
# CONSTRAINTS ENDPOINTS
# ============================================================================

@app.route('/api/missions/<mission_id>/constraints', methods=['POST'])
def add_constraint(mission_id: str):
    """Add constraint to mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    data = request.json
    mission = missions[mission_id]
    
    const_type = deserialize_enum(ConstraintType, data["constraint_type"])
    constraint_val = deserialize_constraint_value(data["constraint"])
    priority = deserialize_enum(Priority, data.get("priority", "medium"))
    
    kwargs = {
        "id": data["id"],
        "title": data["title"],
        "constraint": constraint_val,
        "priority": priority,
        "rationale": data.get("rationale", ""),
        "is_negotiable": data.get("is_negotiable", False),
        "impacts": data.get("impacts", []),
        "notes": data.get("notes", "")
    }
    
    if const_type == ConstraintType.BUDGET:
        kwargs["phase"] = data.get("phase", "total")
        constraint = BudgetConstraint(**kwargs)
    elif const_type == ConstraintType.ORBITAL:
        kwargs["parameter"] = data.get("parameter", "")
        constraint = OrbitalConstraint(**kwargs)
    elif const_type == ConstraintType.MASS:
        kwargs["component"] = data.get("component", "total")
        constraint = MassConstraint(**kwargs)
    elif const_type == ConstraintType.POWER:
        kwargs["mode"] = data.get("mode", "nominal")
        constraint = PowerConstraint(**kwargs)
    elif const_type == ConstraintType.SCHEDULE:
        kwargs["milestone"] = data.get("milestone", "")
        constraint = ScheduleConstraint(**kwargs)
    else:
        constraint = Constraint(**kwargs)
    
    mission.add_constraint(constraint)
    
    return jsonify(serialize_constraint(constraint)), 201


@app.route('/api/missions/<mission_id>/constraints', methods=['GET'])
def get_constraints(mission_id: str):
    """Get all constraints for a mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    return jsonify([serialize_constraint(c) for c in mission.constraints]), 200


@app.route('/api/missions/<mission_id>/constraints/<constraint_id>', methods=['PUT'])
def update_constraint(mission_id: str, constraint_id: str):
    """Update a constraint."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    constraint = next((c for c in mission.constraints if c.id == constraint_id), None)
    
    if not constraint:
        return jsonify({"error": "Constraint not found"}), 404
    
    data = request.json
    if "title" in data:
        constraint.title = data["title"]
    if "constraint" in data:
        constraint.constraint = deserialize_constraint_value(data["constraint"])
    if "is_negotiable" in data:
        constraint.is_negotiable = data["is_negotiable"]
    
    mission.last_modified = datetime.now()
    
    return jsonify(serialize_constraint(constraint)), 200


@app.route('/api/missions/<mission_id>/constraints/<constraint_id>', methods=['DELETE'])
def delete_constraint(mission_id: str, constraint_id: str):
    """Delete a constraint."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    mission.constraints = [c for c in mission.constraints if c.id != constraint_id]
    mission.last_modified = datetime.now()
    
    return jsonify({"message": "Constraint deleted"}), 200


# ============================================================================
# DESIGN SOLUTION ENDPOINTS
# ============================================================================

@app.route('/api/missions/<mission_id>/solutions', methods=['POST'])
def add_design_solution(mission_id: str):
    """Add design solution to mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    data = request.json
    mission = missions[mission_id]
    
    # Deserialize spacecraft and orbit
    spacecraft = deserialize_spacecraft(data["spacecraft"])
    orbit = deserialize_orbit(data["orbit"])
    
    solution = DesignSolution(
        id=data["id"],
        name=data["name"],
        label=data["label"],
        spacecraft=spacecraft,
        orbit=orbit,
        status=deserialize_enum(SolutionStatus, data.get("status", "proposed")),
        notes=data.get("notes", "")
    )
    
    mission.add_design_solution(solution)
    
    return jsonify({
        "id": solution.id,
        "name": solution.name,
        "label": solution.label,
        "status": serialize_enum(solution.status),
        "spacecraft": serialize_spacecraft(spacecraft),
        "orbit": serialize_orbit(orbit)
    }), 201


@app.route('/api/missions/<mission_id>/solutions', methods=['GET'])
def get_design_solutions(mission_id: str):
    """Get all design solutions for a mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    
    return jsonify([{
        "id": sol.id,
        "name": sol.name,
        "label": sol.label,
        "status": serialize_enum(sol.status),
        "spacecraft_id": sol.spacecraft.id,
        "orbit_id": sol.orbit.id
    } for sol in mission.design_solutions]), 200


@app.route('/api/missions/<mission_id>/solutions/<solution_id>', methods=['GET'])
def get_design_solution(mission_id: str, solution_id: str):
    """Get a specific design solution."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    solution = mission.get_design_solution(solution_id)
    
    if not solution:
        return jsonify({"error": "Solution not found"}), 404
    
    return jsonify({
        "id": solution.id,
        "name": solution.name,
        "label": solution.label,
        "status": serialize_enum(solution.status),
        "spacecraft": serialize_spacecraft(solution.spacecraft),
        "orbit": serialize_orbit(solution.orbit),
        "notes": solution.notes
    }), 200


@app.route('/api/missions/<mission_id>/solutions/<solution_id>', methods=['PUT'])
def update_design_solution(mission_id: str, solution_id: str):
    """Update a design solution."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    solution = mission.get_design_solution(solution_id)
    
    if not solution:
        return jsonify({"error": "Solution not found"}), 404
    
    data = request.json
    if "name" in data:
        solution.name = data["name"]
    if "label" in data:
        solution.label = data["label"]
    if "status" in data:
        solution.status = deserialize_enum(SolutionStatus, data["status"])
    if "spacecraft" in data:
        solution.spacecraft = deserialize_spacecraft(data["spacecraft"])
    if "orbit" in data:
        solution.orbit = deserialize_orbit(data["orbit"])
    if "notes" in data:
        solution.notes = data["notes"]
    
    mission.last_modified = datetime.now()
    
    return jsonify({"message": "Solution updated"}), 200


@app.route('/api/missions/<mission_id>/solutions/<solution_id>', methods=['DELETE'])
def delete_design_solution(mission_id: str, solution_id: str):
    """Delete a design solution."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    mission.design_solutions = [s for s in mission.design_solutions if s.id != solution_id]
    mission.last_modified = datetime.now()
    
    return jsonify({"message": "Solution deleted"}), 200


# ============================================================================
# DESIGN ITERATION ENDPOINTS
# ============================================================================

@app.route('/api/missions/<mission_id>/iterations', methods=['POST'])
def add_design_iteration(mission_id: str):
    """Add design iteration to mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    data = request.json
    mission = missions[mission_id]
    
    # Get the solution
    solution = mission.get_design_solution(data["solution_id"])
    if not solution:
        return jsonify({"error": "Solution not found"}), 404
    
    # Get or create evaluation
    evaluation = mission.solution_evaluations.get(data["solution_id"])
    if not evaluation:
        evaluation = mission.evaluate_solution(data["solution_id"])
    
    iteration = mission.add_design_iteration(
        solution=solution,
        evaluation=evaluation,
        changes=data.get("changes_from_previous", ""),
        notes=data.get("iteration_notes", "")
    )
    
    return jsonify({
        "iteration_number": iteration.iteration_number,
        "solution_id": solution.id,
        "solution_label": solution.label,
        "changes_from_previous": iteration.changes_from_previous,
        "iteration_notes": iteration.iteration_notes,
        "created_date": serialize_datetime(iteration.created_date)
    }), 201


@app.route('/api/missions/<mission_id>/iterations', methods=['GET'])
def get_design_iterations(mission_id: str):
    """Get all design iterations for a mission."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    
    return jsonify([{
        "iteration_number": it.iteration_number,
        "solution_id": it.solution.id,
        "solution_label": it.solution.label,
        "changes_from_previous": it.changes_from_previous,
        "iteration_notes": it.iteration_notes,
        "created_date": serialize_datetime(it.created_date)
    } for it in mission.design_iterations]), 200


# ============================================================================
# SOLUTION EVALUATION ENDPOINTS
# ============================================================================

@app.route('/api/missions/<mission_id>/solutions/<solution_id>/evaluate', methods=['POST'])
def evaluate_solution(mission_id: str, solution_id: str):
    """Create evaluation for a solution."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    solution = mission.get_design_solution(solution_id)
    
    if not solution:
        return jsonify({"error": "Solution not found"}), 404
    
    evaluation = mission.evaluate_solution(solution_id)
    
    data = request.json
    
    # Add KPI evaluations
    for kpi_eval_data in data.get("kpi_evaluations", []):
        kpi_eval = KPIEvaluation(
            kpi_id=kpi_eval_data["kpi_id"],
            kpi_name=kpi_eval_data["kpi_name"],
            calculated_value=kpi_eval_data["calculated_value"],
            unit=deserialize_enum(Unit, kpi_eval_data["unit"]),
            status=deserialize_enum(ObjectiveStatus, kpi_eval_data["status"]),
            threshold_met=kpi_eval_data["threshold_met"],
            baseline_met=kpi_eval_data["baseline_met"],
            target_met=kpi_eval_data["target_met"],
            notes=kpi_eval_data.get("notes", "")
        )
        evaluation.add_kpi_evaluation(kpi_eval)
    
    # Add requirement verifications
    for req_ver_data in data.get("requirement_verifications", []):
        req_ver = RequirementVerification(
            requirement_id=req_ver_data["requirement_id"],
            requirement_title=req_ver_data["requirement_title"],
            required_value=req_ver_data["required_value"],
            calculated_value=req_ver_data["calculated_value"],
            unit=deserialize_enum(Unit, req_ver_data["unit"]),
            verified=req_ver_data["verified"],
            margin=req_ver_data["margin"],
            notes=req_ver_data.get("notes", "")
        )
        evaluation.add_requirement_verification(req_ver)
    
    # Add constraint verifications
    for const_ver_data in data.get("constraint_verifications", []):
        const_ver = ConstraintVerification(
            constraint_id=const_ver_data["constraint_id"],
            constraint_title=const_ver_data["constraint_title"],
            constraint_value=const_ver_data["constraint_value"],
            calculated_value=const_ver_data["calculated_value"],
            unit=deserialize_enum(Unit, const_ver_data["unit"]),
            verified=const_ver_data["verified"],
            margin=const_ver_data["margin"],
            is_negotiable=const_ver_data["is_negotiable"],
            notes=const_ver_data.get("notes", "")
        )
        evaluation.add_constraint_verification(const_ver)
    
    # Determine overall status
    evaluation.determine_overall_status()
    
    # Add summary notes
    if "summary_notes" in data:
        evaluation.summary_notes = data["summary_notes"]
    if "strengths" in data:
        evaluation.strengths = data["strengths"]
    if "weaknesses" in data:
        evaluation.weaknesses = data["weaknesses"]
    if "recommendations" in data:
        evaluation.recommendations = data["recommendations"]
    
    return jsonify({
        "evaluation_id": evaluation.id,
        "solution_id": evaluation.solution_id,
        "overall_status": serialize_enum(evaluation.overall_status),
        "kpi_success_rate": evaluation.kpi_success_rate,
        "requirement_success_rate": evaluation.requirement_success_rate,
        "constraint_success_rate": evaluation.constraint_success_rate
    }), 201


@app.route('/api/missions/<mission_id>/solutions/<solution_id>/evaluation', methods=['GET'])
def get_solution_evaluation(mission_id: str, solution_id: str):
    """Get evaluation for a solution."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    evaluation = mission.solution_evaluations.get(solution_id)
    
    if not evaluation:
        return jsonify({"error": "Evaluation not found"}), 404
    
    return jsonify({
        "evaluation_id": evaluation.id,
        "solution_id": evaluation.solution_id,
        "solution_label": evaluation.solution_label,
        "overall_status": serialize_enum(evaluation.overall_status),
        "kpi_success_rate": evaluation.kpi_success_rate,
        "requirement_success_rate": evaluation.requirement_success_rate,
        "constraint_success_rate": evaluation.constraint_success_rate,
        "all_requirements_met": evaluation.all_requirements_met,
        "all_critical_constraints_met": evaluation.all_critical_constraints_met,
        "kpi_evaluations_count": len(evaluation.kpi_evaluations),
        "requirement_verifications_count": len(evaluation.requirement_verifications),
        "constraint_verifications_count": len(evaluation.constraint_verifications),
        "strengths": evaluation.strengths,
        "weaknesses": evaluation.weaknesses,
        "recommendations": evaluation.recommendations
    }), 200


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@app.route('/api/missions/<mission_id>/select-solution/<solution_id>', methods=['POST'])
def select_solution(mission_id: str, solution_id: str):
    """Select a solution as the final design."""
    if mission_id not in missions:
        return jsonify({"error": "Mission not found"}), 404
    
    mission = missions[mission_id]
    solution = mission.get_design_solution(solution_id)
    
    if not solution:
        return jsonify({"error": "Solution not found"}), 404
    
    mission.set_selected_solution(solution_id)
    
    return jsonify({"message": "Solution selected", "solution_id": solution_id}), 200


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "missions_count": len(missions),
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route('/api/docs', methods=['GET'])
def api_docs():
    """API documentation."""
    docs = {
        "name": "SMAD Mission Data Model REST API",
        "version": "1.0.0",
        "endpoints": {
            "Missions": {
                "POST /api/missions": "Create a new mission",
                "GET /api/missions": "List all missions",
                "GET /api/missions/<id>": "Get mission details",
                "PUT /api/missions/<id>": "Update mission",
                "DELETE /api/missions/<id>": "Delete mission"
            },
            "Objectives": {
                "POST /api/missions/<id>/objectives": "Add objective",
                "GET /api/missions/<id>/objectives": "List objectives",
                "PUT /api/missions/<id>/objectives/<obj_id>": "Update objective",
                "DELETE /api/missions/<id>/objectives/<obj_id>": "Delete objective"
            },
            "Requirements": {
                "POST /api/missions/<id>/requirements": "Add requirement",
                "GET /api/missions/<id>/requirements": "List requirements",
                "PUT /api/missions/<id>/requirements/<req_id>": "Update requirement",
                "DELETE /api/missions/<id>/requirements/<req_id>": "Delete requirement"
            },
            "Constraints": {
                "POST /api/missions/<id>/constraints": "Add constraint",
                "GET /api/missions/<id>/constraints": "List constraints",
                "PUT /api/missions/<id>/constraints/<const_id>": "Update constraint",
                "DELETE /api/missions/<id>/constraints/<const_id>": "Delete constraint"
            },
            "Design Solutions": {
                "POST /api/missions/<id>/solutions": "Add design solution",
                "GET /api/missions/<id>/solutions": "List solutions",
                "GET /api/missions/<id>/solutions/<sol_id>": "Get solution details",
                "PUT /api/missions/<id>/solutions/<sol_id>": "Update solution",
                "DELETE /api/missions/<id>/solutions/<sol_id>": "Delete solution"
            },
            "Design Iterations": {
                "POST /api/missions/<id>/iterations": "Add iteration",
                "GET /api/missions/<id>/iterations": "List iterations"
            },
            "Evaluations": {
                "POST /api/missions/<id>/solutions/<sol_id>/evaluate": "Create evaluation",
                "GET /api/missions/<id>/solutions/<sol_id>/evaluation": "Get evaluation"
            },
            "Utilities": {
                "POST /api/missions/<id>/select-solution/<sol_id>": "Select final solution",
                "GET /api/health": "Health check",
                "GET /api/docs": "API documentation"
            }
        }
    }
    return jsonify(docs), 200


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request", "message": str(error)}), 400


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found", "message": str(error)}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error", "message": str(error)}), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("=" * 80)
    print("SMAD Mission Data Model REST API")
    print("=" * 80)
    print("\nStarting Flask server...")
    print("API available at: http://localhost:5000")
    print("\nAPI Documentation: http://localhost:5000/api/docs")
    print("Health Check: http://localhost:5000/api/health")
    print("\nPress CTRL+C to stop the server")
    print("=" * 80 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)