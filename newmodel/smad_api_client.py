"""
SMAD REST API - Client Example
================================
Demonstrates how to interact with the SMAD REST API

Usage:
    python smad_api_client.py
"""

import requests
import json
from typing import Dict, Any

# API base URL
BASE_URL = "http://localhost:5000/api"


class SMADClient:
    """Client for SMAD REST API."""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
    
    # ========================================================================
    # MISSION OPERATIONS
    # ========================================================================
    
    def create_mission(self, mission_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new mission."""
        response = self.session.post(f"{self.base_url}/missions", json=mission_data)
        response.raise_for_status()
        return response.json()
    
    def get_missions(self) -> list:
        """Get all missions."""
        response = self.session.get(f"{self.base_url}/missions")
        response.raise_for_status()
        return response.json()
    
    def get_mission(self, mission_id: str) -> Dict[str, Any]:
        """Get a specific mission."""
        response = self.session.get(f"{self.base_url}/missions/{mission_id}")
        response.raise_for_status()
        return response.json()
    
    def update_mission(self, mission_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update mission details."""
        response = self.session.put(f"{self.base_url}/missions/{mission_id}", json=updates)
        response.raise_for_status()
        return response.json()
    
    def delete_mission(self, mission_id: str) -> Dict[str, Any]:
        """Delete a mission."""
        response = self.session.delete(f"{self.base_url}/missions/{mission_id}")
        response.raise_for_status()
        return response.json()
    
    # ========================================================================
    # OBJECTIVE OPERATIONS
    # ========================================================================
    
    def add_objective(self, mission_id: str, objective_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add objective to mission."""
        response = self.session.post(
            f"{self.base_url}/missions/{mission_id}/objectives",
            json=objective_data
        )
        response.raise_for_status()
        return response.json()
    
    def get_objectives(self, mission_id: str) -> list:
        """Get all objectives for a mission."""
        response = self.session.get(f"{self.base_url}/missions/{mission_id}/objectives")
        response.raise_for_status()
        return response.json()
    
    # ========================================================================
    # REQUIREMENT OPERATIONS
    # ========================================================================
    
    def add_requirement(self, mission_id: str, requirement_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add requirement to mission."""
        response = self.session.post(
            f"{self.base_url}/missions/{mission_id}/requirements",
            json=requirement_data
        )
        response.raise_for_status()
        return response.json()
    
    def get_requirements(self, mission_id: str) -> list:
        """Get all requirements for a mission."""
        response = self.session.get(f"{self.base_url}/missions/{mission_id}/requirements")
        response.raise_for_status()
        return response.json()
    
    # ========================================================================
    # CONSTRAINT OPERATIONS
    # ========================================================================
    
    def add_constraint(self, mission_id: str, constraint_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add constraint to mission."""
        response = self.session.post(
            f"{self.base_url}/missions/{mission_id}/constraints",
            json=constraint_data
        )
        response.raise_for_status()
        return response.json()
    
    def get_constraints(self, mission_id: str) -> list:
        """Get all constraints for a mission."""
        response = self.session.get(f"{self.base_url}/missions/{mission_id}/constraints")
        response.raise_for_status()
        return response.json()
    
    # ========================================================================
    # DESIGN SOLUTION OPERATIONS
    # ========================================================================
    
    def add_design_solution(self, mission_id: str, solution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add design solution to mission."""
        response = self.session.post(
            f"{self.base_url}/missions/{mission_id}/solutions",
            json=solution_data
        )
        response.raise_for_status()
        return response.json()
    
    def get_design_solutions(self, mission_id: str) -> list:
        """Get all design solutions for a mission."""
        response = self.session.get(f"{self.base_url}/missions/{mission_id}/solutions")
        response.raise_for_status()
        return response.json()
    
    def get_design_solution(self, mission_id: str, solution_id: str) -> Dict[str, Any]:
        """Get specific design solution."""
        response = self.session.get(
            f"{self.base_url}/missions/{mission_id}/solutions/{solution_id}"
        )
        response.raise_for_status()
        return response.json()
    
    # ========================================================================
    # ITERATION OPERATIONS
    # ========================================================================
    
    def add_design_iteration(self, mission_id: str, iteration_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add design iteration to mission."""
        response = self.session.post(
            f"{self.base_url}/missions/{mission_id}/iterations",
            json=iteration_data
        )
        response.raise_for_status()
        return response.json()
    
    def get_design_iterations(self, mission_id: str) -> list:
        """Get all design iterations for a mission."""
        response = self.session.get(f"{self.base_url}/missions/{mission_id}/iterations")
        response.raise_for_status()
        return response.json()
    
    # ========================================================================
    # EVALUATION OPERATIONS
    # ========================================================================
    
    def evaluate_solution(self, mission_id: str, solution_id: str, 
                         evaluation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create evaluation for a solution."""
        response = self.session.post(
            f"{self.base_url}/missions/{mission_id}/solutions/{solution_id}/evaluate",
            json=evaluation_data
        )
        response.raise_for_status()
        return response.json()
    
    def get_evaluation(self, mission_id: str, solution_id: str) -> Dict[str, Any]:
        """Get evaluation for a solution."""
        response = self.session.get(
            f"{self.base_url}/missions/{mission_id}/solutions/{solution_id}/evaluation"
        )
        response.raise_for_status()
        return response.json()
    
    # ========================================================================
    # UTILITY OPERATIONS
    # ========================================================================
    
    def select_solution(self, mission_id: str, solution_id: str) -> Dict[str, Any]:
        """Select a solution as final design."""
        response = self.session.post(
            f"{self.base_url}/missions/{mission_id}/select-solution/{solution_id}"
        )
        response.raise_for_status()
        return response.json()
    
    def health_check(self) -> Dict[str, Any]:
        """Check API health."""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

def main():
    """Demonstrate API usage."""
    
    print("=" * 80)
    print("SMAD REST API - Client Example")
    print("=" * 80)
    
    # Create client
    client = SMADClient()
    
    # Check API health
    print("\n1. Checking API health...")
    health = client.health_check()
    print(f"   Status: {health['status']}")
    print(f"   Missions count: {health['missions_count']}")
    
    # Create mission
    print("\n2. Creating mission...")
    mission_data = {
        "id": "MISSION-001",
        "name": "EarthWatch Mission",
        "description": "Climate monitoring satellite mission",
        "mission_type": "Earth Observation"
    }
    mission = client.create_mission(mission_data)
    print(f"   Created: {mission['name']}")
    print(f"   ID: {mission['id']}")
    
    # Add objective
    print("\n3. Adding mission objective...")
    objective_data = {
        "id": "OBJ-001",
        "title": "Monitor Climate Change",
        "description": "Track global climate indicators",
        "priority": "critical",
        "category": "Climate Science",
        "stakeholders": ["NASA", "NOAA"]
    }
    objective = client.add_objective(mission['id'], objective_data)
    print(f"   Added: {objective['title']}")
    
    # Add requirement
    print("\n4. Adding requirement...")
    requirement_data = {
        "id": "REQ-001",
        "title": "Spatial Resolution Requirement",
        "requirement_type": "spatial_resolution",
        "constraint": {
            "operator": "<=",
            "value": 15.0,
            "unit": "m"
        },
        "priority": "critical",
        "rationale": "Needed for vegetation monitoring"
    }
    requirement = client.add_requirement(mission['id'], requirement_data)
    print(f"   Added: {requirement['title']}")
    
    # Add constraint
    print("\n5. Adding constraint...")
    constraint_data = {
        "id": "CON-001",
        "title": "Total Mass Constraint",
        "constraint_type": "mass",
        "constraint": {
            "operator": "<=",
            "value": 1500.0,
            "unit": "kg"
        },
        "priority": "critical",
        "is_negotiable": False,
        "component": "total"
    }
    constraint = client.add_constraint(mission['id'], constraint_data)
    print(f"   Added: {constraint['title']}")
    
    # Add design solution
    print("\n6. Adding design solution...")
    solution_data = {
        "id": "SOL-001",
        "name": "Baseline Design",
        "label": "15m @ 705km",
        "status": "proposed",
        "spacecraft": {
            "id": "SC-001",
            "name": "EarthWatch Satellite",
            "dry_mass_margin": 20.0,
            "power_margin": 30.0,
            "cost_margin": 25.0,
            "design_life": 7.0,
            "components": [
                {
                    "id": "PL-001",
                    "name": "Multispectral Imager",
                    "component_type": "payload_instrument",
                    "active_power": 180.0,
                    "passive_power": 25.0,
                    "mass": 285.0,
                    "cost": 22000000,
                    "manufacturer": "Aerospace Inc",
                    "technology_readiness_level": 9,
                    "heritage": "Landsat-8",
                    "properties": {},
                    "notes": "",
                    "payload_data": {
                        "focal_length": 1.85,
                        "aperture_diameter": 0.30,
                        "detector_type": "CCD",
                        "detector_array_size_along_track": 1,
                        "detector_array_size_across_track": 14624,
                        "pixel_pitch": 13.0,
                        "spectral_bands": [
                            {
                                "name": "Red",
                                "center_wavelength": 665,
                                "bandwidth": 30,
                                "purpose": "vegetation"
                            },
                            {
                                "name": "NIR",
                                "center_wavelength": 842,
                                "bandwidth": 115,
                                "purpose": "biomass"
                            }
                        ],
                        "ground_sample_distance": 13.9,
                        "swath_width": 185.0,
                        "signal_to_noise_ratio": 175.0,
                        "radiometric_resolution": 12,
                        "integration_time": 2.85,
                        "duty_cycle": 15.0,
                        "data_rate": 384.0,
                        "quantization": 12
                    }
                },
                {
                    "id": "EPS-001",
                    "name": "Solar Array",
                    "component_type": "eps",
                    "active_power": 15.0,
                    "passive_power": 8.0,
                    "mass": 185.0,
                    "cost": 8500000,
                    "manufacturer": "PowerTech",
                    "technology_readiness_level": 9,
                    "heritage": "Multiple missions",
                    "properties": {
                        "power_generation_eol": 1250.0
                    },
                    "notes": ""
                }
            ]
        },
        "orbit": {
            "id": "ORB-001",
            "name": "Sun-Synchronous Orbit",
            "label": "705km SSO",
            "semi_major_axis": 7083.137,
            "eccentricity": 0.0,
            "inclination": 98.2,
            "raan": 0.0,
            "argument_of_perigee": 0.0,
            "true_anomaly": 0.0,
            "altitude": 705.0,
            "is_sun_synchronous": True,
            "local_time_ascending_node": "10:30",
            "revisit_time_global": 3.0,
            "coverage_per_day": 88.0,
            "orbital_lifetime": 18.0,
            "notes": "Baseline orbit"
        },
        "notes": "Initial baseline design"
    }
    solution = client.add_design_solution(mission['id'], solution_data)
    print(f"   Added: {solution['label']}")
    print(f"   Spacecraft: {solution['spacecraft']['name']}")
    print(f"   Orbit: {solution['orbit']['label']}")
    
    # Create evaluation
    print("\n7. Creating solution evaluation...")
    evaluation_data = {
        "kpi_evaluations": [
            {
                "kpi_id": "KPI-001",
                "kpi_name": "Ground Sample Distance",
                "calculated_value": 13.9,
                "unit": "m",
                "status": "baseline_met",
                "threshold_met": True,
                "baseline_met": True,
                "target_met": False
            }
        ],
        "requirement_verifications": [
            {
                "requirement_id": "REQ-001",
                "requirement_title": "Spatial Resolution",
                "required_value": "<= 15.0 m",
                "calculated_value": 13.9,
                "unit": "m",
                "verified": True,
                "margin": 1.1
            }
        ],
        "constraint_verifications": [
            {
                "constraint_id": "CON-001",
                "constraint_title": "Total Mass",
                "constraint_value": "<= 1500 kg",
                "calculated_value": 470.0,
                "unit": "kg",
                "verified": True,
                "margin": 1030.0,
                "is_negotiable": False
            }
        ],
        "strengths": [
            "Meets all requirements",
            "Good mass margin",
            "Heritage payload"
        ],
        "weaknesses": [
            "GSD only meets baseline"
        ],
        "recommendations": [
            "Consider lower orbit for better GSD"
        ]
    }
    evaluation = client.evaluate_solution(mission['id'], solution_data['id'], evaluation_data)
    print(f"   Evaluation created")
    print(f"   Overall Status: {evaluation['overall_status']}")
    print(f"   Requirements Met: {evaluation['requirement_success_rate']:.0f}%")
    
    # Add design iteration
    print("\n8. Adding design iteration...")
    iteration_data = {
        "solution_id": solution_data['id'],
        "changes_from_previous": "Initial baseline design",
        "iteration_notes": "First iteration with heritage payload"
    }
    iteration = client.add_design_iteration(mission['id'], iteration_data)
    print(f"   Iteration {iteration['iteration_number']}: {iteration['solution_label']}")
    
    # Select solution
    print("\n9. Selecting final solution...")
    result = client.select_solution(mission['id'], solution_data['id'])
    print(f"   {result['message']}")
    
    # Get mission summary
    print("\n10. Final mission summary...")
    mission_details = client.get_mission(mission['id'])
    print(f"   Mission: {mission_details['name']}")
    print(f"   Objectives: {mission_details['objectives_count']}")
    print(f"   Requirements: {mission_details['requirements_count']}")
    print(f"   Constraints: {mission_details['constraints_count']}")
    print(f"   Solutions: {mission_details['design_solutions_count']}")
    print(f"   Iterations: {mission_details['design_iterations_count']}")
    print(f"   Selected Solution: {mission_details['selected_solution_id']}")
    
    print("\n" + "=" * 80)
    print("Example completed successfully!")
    print("=" * 80)
    
    # Print all available data
    print("\n" + "=" * 80)
    print("COMPLETE MISSION DATA")
    print("=" * 80)
    
    print("\nObjectives:")
    objectives = client.get_objectives(mission['id'])
    for obj in objectives:
        print(f"  - {obj['id']}: {obj['title']}")
    
    print("\nRequirements:")
    requirements = client.get_requirements(mission['id'])
    for req in requirements:
        print(f"  - {req['id']}: {req['title']}")
    
    print("\nConstraints:")
    constraints = client.get_constraints(mission['id'])
    for const in constraints:
        print(f"  - {const['id']}: {const['title']}")
    
    print("\nDesign Solutions:")
    solutions = client.get_design_solutions(mission['id'])
    for sol in solutions:
        print(f"  - {sol['id']}: {sol['label']} ({sol['status']})")
    
    print("\nDesign Iterations:")
    iterations = client.get_design_iterations(mission['id'])
    for it in iterations:
        print(f"  - Iteration {it['iteration_number']}: {it['solution_label']}")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to API server.")
        print("Make sure the Flask server is running at http://localhost:5000")
        print("Start it with: python smad_rest_api.py")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()