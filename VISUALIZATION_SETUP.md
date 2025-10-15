# Mission Visualization Setup

The mission workspace includes a **Visualization** tab that displays spacecraft ground tracks and ground stations on an interactive world map using Leaflet.

## Installation

The Leaflet dependencies have been added to package.json. Install them with:

```bash
npm install
```

## Features

- **Interactive World Map**: Real OpenStreetMap tiles with zoom/pan controls
- **Satellite Ground Tracks**: Calculated orbital paths over Earth's surface
- **Ground Stations**: Station locations with detailed information popups
- **Multiple Satellites**: Different colored tracks for constellation visualization
- **Real Orbital Mechanics**: Accounts for Earth rotation and orbital inclination

## Usage

1. Navigate to a mission workspace
2. Create design solutions in the **Solutions** tab with:
   - Spacecraft configuration
   - Orbital parameters (altitude, inclination, period)
   - Ground station locations
3. Go to the **Visualization** tab
4. Select a design solution from the dropdown
5. View the satellite ground tracks and ground station coverage

## Map Features

- **Ground Tracks**: Colored lines showing satellite paths over Earth
- **Ground Stations**: Orange circular markers with station details
- **Satellites**: Diamond-shaped markers showing current positions
- **Legend**: Visual guide to distinguish between elements
- **Popups**: Click markers for detailed information

## Controls

- **Mouse**: Pan and zoom the map
- **Markers**: Click for detailed information
- **Solution Selector**: Switch between different mission designs
- **Legend**: Identify satellites vs ground stations

The visualization uses real orbital mechanics calculations to show accurate ground tracks that account for Earth's rotation and satellite orbital parameters.