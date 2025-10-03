# SMAD REST API Documentation

## Overview

The SMAD (Space Mission Analysis and Design) REST API provides endpoints for managing mission objectives, requirements, constraints, and design iterations for space missions.

**Base URL**: `http://localhost:5000/api`

## Quick Start

### 1. Start the Server
```bash
python smad_rest_api.py
```
In another terminal, run the client example
```bash
python smad_api_client.py
```

Or use curl/Postman to interact with the API
```bash
curl http://localhost:5000/api/health
```

### 2. Check Health
```bash
curl http://localhost:5000/api/health
```

### 3. View Documentation
```bash
curl http://localhost:5000/api/docs
```

## API Endpoints

### Missions

#### Create Mission
```http
POST /api/missions
Content-Type: application/json

{
  "id": "MISSION-001",
  "name": "EarthWatch Mission",
  "description": "Climate monitoring satellite",
  "mission_type": "Earth Observation"
}
```

#### List All Missions
```http
GET /api/missions
```

#### Get Mission Details
```http
GET /api/missions/{mission_id}
```

#### Update Mission
```http
PUT /api/missions/{mission_id}
Content-Type: application/json

{
  "name": "Updated Mission Name",
  "description": "Updated description"
}
```

#### Delete Mission
```http
DELETE /api/missions/{mission_id}
```

---

### Mission Objectives

#### Add Objective
```http
POST /api/missions/{mission_id}/objectives
Content-Type: application/json

{
  "id": "OBJ-001",
  "title": "Monitor Climate Change",
  "description": "Track global climate indicators",
  "priority": "critical",
  "category": "Climate Science",
  "stakeholders": ["NASA", "NOAA"]
}
```

**Priority Values**: `critical`, `high`, `medium`, `low`

#### List Objectives
```http
GET /api/missions/{mission_id}/objectives
```

#### Update Objective
```http
PUT /api/missions/{mission_id}/objectives/{objective_id}
Content-Type: application/json

{
  "title": "Updated Title",
  "priority": "high"
}
```

#### Delete Objective
```http
DELETE /api/missions/{mission_id}/objectives/{objective_id}
```

---

### Requirements

#### Add Requirement
```http
POST /api/missions/{mission_id}/requirements
Content-Type: application/json

{
  "id": "REQ-001",
  "title": "Spatial Resolution Requirement",
  "requirement_type": "spatial_resolution",
  "constraint": {
    "operator": "<=",
    "value": 15.0,
    "unit": "m"
  },
  "priority": "critical",
  "rationale": "Needed for vegetation monitoring",
  "verification_method": "On-orbit calibration"
}
```

**Requirement Types**:
- `spatial_resolution` - Ground sample distance
- `temporal_resolution` - Revisit time
- `spectral_resolution` - Number of spectral bands
- `radiometric_resolution` - Bit depth
- `swath_width` - Imaging swath
- `coverage_area` - Coverage percentage
- `data_latency` - Time to deliver data

**Operators**: `<`, `<=`, `==`, `>=`, `>`, `between`, `!=`

**Units**: `m`, `km`, `days`, `hours`, `count`, `bits`, `%`, etc.

#### List Requirements
```http
GET /api/missions/{mission_id}/requirements
```

#### Update Requirement
```http
PUT /api/missions/{mission_id}/requirements/{requirement_id}
```

#### Delete Requirement
```http
DELETE /api/missions/{mission_id}/requirements/{requirement_id}
```

---

### Constraints

#### Add Constraint
```http
POST /api/missions/{mission_id}/constraints
Content-Type: application/json

{
  "id": "CON-001",
  "title": "Total Mass Constraint",
  "constraint_type": "mass",
  "constraint": {
    "operator": "<=",
    "value": 1500.0,
    "unit": "kg"
  },
  "priority": "critical",
  "is_negotiable": false,
  "component": "total",
  "rationale": "Launch vehicle capacity"
}
```

**Constraint Types**:
- `mass` - Mass budget (with `component` field)
- `power` - Power budget (with `mode` field: "nominal", "peak")
- `budget` - Cost budget (with `phase` field: "total", "development")
- `orbital` - Orbital parameters (with `parameter` field)
- `schedule` - Schedule milestones (with `milestone` field)

#### List Constraints
```http
GET /api/missions/{mission_id}/constraints
```

#### Update Constraint
```http
PUT /api/missions/{mission_id}/constraints/{constraint_id}
```

#### Delete Constraint
```http
DELETE /api/missions/{mission_id}/constraints/{constraint_id}
```

---

### Design Solutions

#### Add Design Solution
```http
POST /api/missions/{mission_id}/solutions
Content-Type: application/json

{
  "id": "SOL-001",
  "name": "Baseline Design",
  "label": "15m @ 705km",
  "status": "proposed",
  "spacecraft": {
    "id": "SC-001",
    "name": "Satellite Name",
    "components": [
      {
        "id": "PL-001",
        "name": "Payload Instrument",
        "component_type": "payload_instrument",
        "active_power": 180.0,
        "passive_power": 25.0,
        "mass": 285.0,
        "cost": 22000000,
        "payload_data": {
          "focal_length": 1.85,
          "aperture_diameter": 0.30,
          "ground_sample_distance": 13.9,
          "swath_width": 185.0
        }
      }
    ]
  },
  "orbit": {
    "id": "ORB-001",
    "name": "Sun-Synchronous Orbit",
    "label": "705km SSO",
    "semi_major_axis": 7083.137,
    "inclination": 98.2,
    "altitude": 705.0,
    "is_sun_synchronous": true
  }
}
```

**Component Types**:
- `payload_instrument` - Payload with detailed optical parameters
- `eps` - Electric Power System
- `adcs` - Attitude Determination and Control
- `communications` - Communications subsystem
- `platform_avionics` - Platform computer
- `payload_avionics` - Payload processor
- `propulsion` - Propulsion system
- `thermal` - Thermal control
- `structure` - Structure and mechanisms

#### List Solutions
```http
GET /api/missions/{mission_id}/solutions
```

#### Get Solution Details
```http
GET /api/missions/{mission_id}/solutions/{solution_id}
```

#### Update Solution
```http
PUT /api/missions/{mission_id}/solutions/{solution_id}
```

#### Delete Solution
```http
DELETE /api/missions/{mission_id}/solutions/{solution_id}
```

---

### Design Iterations

#### Add Design Iteration
```http
POST /api/missions/{mission_id}/iterations
Content-Type: application/json

{
  "solution_id": "SOL-001",
  "changes_from_previous": "Initial baseline design",
  "iteration_notes": "First iteration with heritage payload"
}
```

#### List Iterations
```http
GET /api/missions/{mission_id}/iterations
```

---

### Solution Evaluations

#### Create Evaluation
```http
POST /api/missions/{mission_id}/solutions/{solution_id}/evaluate
Content-Type: application/json

{
  "kpi_evaluations": [
    {
      "kpi_id": "KPI-001",
      "kpi_name": "Ground Sample Distance",
      "calculated_value": 13.9,
      "unit": "m",
      "status": "baseline_met",
      "threshold_met": true,
      "baseline_met": true,
      "target_met": false
    }
  ],
  "requirement_verifications": [
    {
      "requirement_id": "REQ-001",
      "requirement_title": "Spatial Resolution",
      "required_value": "<= 15.0 m",
      "calculated_value": 13.9,
      "unit": "m",
      "verified": true,
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
      "verified": true,
      "margin": 1030.0,
      "is_negotiable": false
    }
  ],
  "strengths": ["Meets all requirements", "Good margin"],
  "weaknesses": ["Higher cost"],
  "recommendations": ["Consider cost optimization"]
}
```

#### Get Evaluation
```http
GET /api/missions/{mission_id}/solutions/{solution_id}/evaluation
```

---

### Utility Endpoints

#### Select Final Solution
```http
POST /api/missions/{mission_id}/select-solution/{solution_id}
```

#### Health Check
```http
GET /api/health
```

#### API Documentation
```http
GET /api/docs
```

---

## Python Client Usage

```python
from smad_api_client import SMADClient

# Create client
client = SMADClient("http://localhost:5000/api")

# Check health
health = client.health_check()

# Create mission
mission = client.create_mission({
    "id": "MISSION-001",
    "name": "My Mission",
    "description": "Mission description"
})

# Add objective
objective = client.add_objective(mission['id'], {
    "id": "OBJ-001",
    "title": "Mission Objective",
    "description": "Objective description",
    "priority": "critical"
})

# Add requirement
requirement = client.add_requirement(mission['id'], {
    "id": "REQ-001",
    "title": "Spatial Resolution",
    "requirement_type": "spatial_resolution",
    "constraint": {
        "operator": "<=",
        "value": 15.0,
        "unit": "m"
    }
})

# Add design solution
solution = client.add_design_solution(mission['id'], solution_data)

# Evaluate solution
evaluation = client.evaluate_solution(
    mission['id'], 
    solution['id'], 
    evaluation_data
)

# Select solution
client.select_solution(mission['id'], solution['id'])
```

---

## Response Status Codes

- `200 OK` - Successful GET/PUT request
- `201 Created` - Successful POST request (resource created)
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Data Model Summary

### Mission Hierarchy
```
Mission
├── Objectives
│   └── Quantitative Objectives
│       ├── KPIs (Key Performance Indicators)
│       └── Figures of Merit
├── Requirements
│   ├── Spatial Resolution
│   ├── Temporal Resolution
│   ├── Spectral Resolution
│   └── Others...
├── Constraints
│   ├── Mass
│   ├── Power
│   ├── Budget
│   └── Others...
├── Design Solutions
│   ├── Spacecraft
│   │   └── Components (Payload, EPS, ADCS, etc.)
│   └── Orbit (Keplerian elements)
└── Design Iterations
    └── Solution Evaluations
        ├── KPI Evaluations
        ├── Requirement Verifications
        └── Constraint Verifications
```

---

## Examples

### Complete Workflow Example

```python
# 1. Create mission
mission = client.create_mission({...})

# 2. Define objectives
objective = client.add_objective(mission['id'], {...})

# 3. Define requirements
req1 = client.add_requirement(mission['id'], {...})
req2 = client.add_requirement(mission['id'], {...})

# 4. Define constraints
const1 = client.add_constraint(mission['id'], {...})
const2 = client.add_constraint(mission['id'], {...})

# 5. Create design solution (Iteration 1)
solution1 = client.add_design_solution(mission['id'], {...})

# 6. Evaluate solution
eval1 = client.evaluate_solution(mission['id'], solution1['id'], {...})

# 7. Add iteration
iter1 = client.add_design_iteration(mission['id'], {
    "solution_id": solution1['id'],
    "changes_from_previous": "Initial design"
})

# 8. Refine design (Iteration 2)
solution2 = client.add_design_solution(mission['id'], {...})
eval2 = client.evaluate_solution(mission['id'], solution2['id'], {...})
iter2 = client.add_design_iteration(mission['id'], {
    "solution_id": solution2['id'],
    "changes_from_previous": "Improved GSD"
})

# 9. Select final solution
client.select_solution(mission['id'], solution1['id'])

# 10. Get final summary
mission_summary = client.get_mission(mission['id'])
```

---

## Notes

- All data is stored in-memory (use database for production)
- API uses JSON for all request/response bodies
- Timestamps are in ISO 8601 format
- The API follows RESTful conventions
- Error responses include descriptive messages

---

## Support

For issues or questions:
- Check API documentation: `GET /api/docs`
- Review example client: `smad_api_client.py`
- Examine data model: `smad_data_model_condensed.py`